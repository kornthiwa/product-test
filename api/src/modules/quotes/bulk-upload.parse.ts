import { BadRequestException } from '@nestjs/common';
import { Job, JobItemStatus, JobStatus } from '../jobs/entities/job.entity';

export type BulkUploadFile = {
  buffer: Buffer;
  originalname?: string;
  mimetype?: string;
};

function stripBom(text: string): string {
  if (text.charCodeAt(0) === 0xfeff) return text.slice(1);
  return text;
}

function looksLikeJson(text: string): boolean {
  const t = text.trimStart();
  return t.startsWith('{') || t.startsWith('[');
}

function parseJsonToJobs(raw: unknown): Job[] {
  let payload = raw;
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    Array.isArray((payload as { data: unknown }).data)
  ) {
    payload = (payload as { data: unknown[] }).data;
  }
  if (!Array.isArray(payload)) {
    throw new BadRequestException(
      'JSON must be an array of jobs or { "data": Job[] }.',
    );
  }
  return payload as Job[];
}

/** Minimal CSV row split (no quoted commas; matches sample bulk_quotes.csv). */
function splitCsvLine(line: string): string[] {
  return line.split(',').map((c) => c.trim());
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

function parseCsvToJobs(text: string): Job[] {
  const lines = stripBom(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new BadRequestException(
      'CSV must include a header row and at least one data row.',
    );
  }

  const header = splitCsvLine(lines[0]).map(normalizeHeader);
  const idx = (name: string) => header.indexOf(name);

  const reqIdCol = idx('request_id');
  const itemIdxCol = idx('item_index');
  const productCol = idx('product_id');
  const qtyCol = idx('quantity');
  const distCol = idx('distance_km');

  if (reqIdCol === -1 || productCol === -1 || qtyCol === -1) {
    throw new BadRequestException(
      'CSV header must include request_id, product_id, and quantity (optional: item_index, distance_km).',
    );
  }

  type Row = {
    requestId: string;
    itemIndex: number;
    productId: string;
    quantity: number;
    distanceKm?: number;
  };

  const rows: Row[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = splitCsvLine(lines[i]);
    if (parts.length < header.length) {
      throw new BadRequestException(`CSV row ${i + 1}: not enough columns.`);
    }

    const requestId = String(parts[reqIdCol] ?? '').trim();
    const productId = String(parts[productCol] ?? '').trim();
    const qtyRaw = String(parts[qtyCol] ?? '').trim();
    const quantity = Number(qtyRaw);
    if (!requestId || !productId || !Number.isFinite(quantity) || quantity < 1) {
      throw new BadRequestException(
        `CSV row ${i + 1}: invalid request_id, product_id, or quantity.`,
      );
    }

    let itemIndex = itemIdxCol >= 0 ? Number(parts[itemIdxCol]) : 0;
    if (!Number.isFinite(itemIndex) || itemIndex < 0) itemIndex = 0;

    let distanceKm: number | undefined;
    if (distCol >= 0) {
      const d = String(parts[distCol] ?? '').trim();
      if (d !== '') {
        const n = Number(d);
        if (!Number.isFinite(n) || n < 0) {
          throw new BadRequestException(
            `CSV row ${i + 1}: distance_km must be a non-negative number or empty.`,
          );
        }
        distanceKm = n;
      }
    }

    rows.push({ requestId, itemIndex, productId, quantity, distanceKm });
  }

  const byRequest = new Map<string, Row[]>();
  for (const r of rows) {
    const list = byRequest.get(r.requestId) ?? [];
    list.push(r);
    byRequest.set(r.requestId, list);
  }

  const jobs: Job[] = [];
  for (const [, group] of byRequest) {
    group.sort((a, b) => a.itemIndex - b.itemIndex);
    const distanceKm =
      group.map((g) => g.distanceKm).find((d) => d != null) ?? undefined;

    const items = group.map((g) => ({
      index: g.itemIndex,
      productId: g.productId,
      quantity: g.quantity,
      status: 'pending' as JobItemStatus,
    }));

    jobs.push({
      jobId: 0,
      is_active: true,
      status: 'queued' as JobStatus,
      distanceKm,
      items,
    });
  }

  return jobs;
}

function isCsvUpload(file: BulkUploadFile): boolean {
  const name = file.originalname?.toLowerCase() ?? '';
  const mime = file.mimetype?.toLowerCase() ?? '';
  if (name.endsWith('.csv')) return true;
  if (name.endsWith('.json')) return false;
  if (mime.includes('csv') || mime === 'text/csv' || mime === 'application/csv')
    return true;
  if (mime.includes('json')) return false;
  return false;
}

export function parseBulkUploadToJobs(file: BulkUploadFile): Job[] {
  const text = file.buffer.toString('utf8');

  if (isCsvUpload(file)) {
    return parseCsvToJobs(text);
  }

  if (looksLikeJson(text)) {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new BadRequestException('File must be valid JSON.');
    }
    return parseJsonToJobs(raw);
  }

  try {
    return parseCsvToJobs(text);
  } catch (csvErr) {
    try {
      const raw = JSON.parse(text);
      return parseJsonToJobs(raw);
    } catch {
      throw csvErr instanceof BadRequestException
        ? csvErr
        : new BadRequestException(
            'Could not parse file as JSON or CSV. Upload .csv with header request_id,product_id,quantity or JSON array / { data: [] }.',
          );
    }
  }
}
