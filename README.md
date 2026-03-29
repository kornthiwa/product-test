# Pricing Platform

Backend สำหรับคำนวณราคา (quote) จาก **กฎราคาแบบตั้งค่าได้** — โครงแบบ **modular monolith** ด้วย NestJS โค้ดหลักอยู่ที่โฟลเดอร์ [`api/`](api/)

---

## ความสามารถหลัก

| พื้นที่ | รายละเอียด |
|--------|------------|
| **Pricing** | `POST /quotes/price` คำนวณราคาทันทีจากสินค้า + กฎที่มีผล ณ เวลาที่กำหนด |
| **Bulk** | `POST /quotes/bulk` อัปโหลดไฟล์ **CSV หรือ JSON** (multipart field `file`) แล้วสร้างงาน (job) ที่คำนวณราคาแล้วทีละรายการ |
| **Jobs** | `GET /jobs/:jobId` ดึงผลงานตามเลข `jobId`, รายการแบ่งหน้า, CRUD/sync จาก JSON |
| **Rules** | CRUD กฎ, ซิงก์จาก `data/rules.json`, รายการแบ่งหน้า + แคช Redis |
| **Products** | CRUD/sync สินค้าจาก `data/products.json` (ใช้ประกอบการคิดราคา) |
| **Health** | `GET /health` |

ประเภทกฎที่รองรับ: `TimeWindowPromotion`, `RemoteAreaSurcharge`, `WeightTier` — มี metadata: `priority`, `effective_from`, `effective_to`, `is_active`

---

## สถาปัตยกรรม (ภาพรวม)

```text
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  HTTP API   │────▶│   Modules    │────▶│  MongoDB    │
│  (NestJS)   │     │ rules,       │     │ (rules,     │
│             │     │ quotes,      │     │  products,  │
│             │     │ jobs,        │     │  jobs)      │
│             │     │ products     │     └─────────────┘
└─────────────┘     └──────┬───────┘
                           │
                           ▼
                    ┌─────────────┐
                    │    Redis    │
                    │ (list cache)│
                    └─────────────┘
```

- **Quote pricing:** logic กลางใน `quotes/quote-pricing.ts` — ใช้ทั้ง `QuotesService` และ `JobsService` ตอนสร้างงานที่มีการคิดราคา
- **ข้อมูลตัวอย่าง:** ไฟล์ JSON ใต้ `api/data/` สามารถ sync เข้า MongoDB ผ่าน endpoint `*/syncjson`

> โปรเจกต์นี้ใช้ **MongoDB + Redis** สำหรับ persistence และแคช (หนักกว่า “in-memory / JSON file only” ในสเปกบางชุด — เหมาะกับ demo ที่ต้องการ persistence จริง)

---

## โครงสร้าง repository

```text
product/
├── api/                          # NestJS API (รันและทดสอบหลักที่นี่)
│   ├── data/
│   │   ├── rules.json
│   │   ├── products.json
│   │   ├── jobs.json
│   │   ├── bulk_quotes.csv       # ตัวอย่าง bulk CSV
│   │   └── jobs-bulk-test-500.json
│   ├── postman/
│   │   └── Pricing-Platform.postman_collection.json
│   ├── src/modules/              # rules | quotes | jobs | products
│   ├── test/                     # E2E (Jest + Supertest)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── package.json
├── app/                          # (ถ้ามี) แอป frontend แยกต่างหาก
└── README.md                     # ไฟล์นี้
```

---

## ความต้องการของระบบ

- **Node.js** 20+
- **Yarn** (หรือใช้ `npm` แทนได้ถ้าปรับคำสั่งเอง)
- **MongoDB** และ **Redis** เมื่อรันนอก Docker  
  - MongoDB ค่าเริ่มต้น: `mongodb://localhost:27017/pricing_platform`  
  - Redis: `redis://localhost:6379`

---

## ติดตั้งและรันแบบ local

จากโฟลเดอร์ `api/`:

```bash
yarn install
yarn build
yarn start:dev
```

- Base URL: `http://localhost:3000` (หรือตาม `PORT`)
- หลังรันครั้งแรก แนะนำเรียกซิงก์ข้อมูลตัวอย่าง:
  - `GET http://localhost:3000/rules/syncjson`
  - `GET http://localhost:3000/products/syncjson`

---

## Docker Compose

จากโฟลเดอร์ `api/`:

```bash
docker compose up --build
```

บริการ: **api** (พอร์ต `3000`), **mongo** (`27017`), **redis** (`6379`)

หยุด:

```bash
docker compose down
```

---

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | ความหมาย | ค่าเริ่มต้น (ถ้าไม่ตั้ง) |
|--------|-----------|---------------------------|
| `PORT` | พอร์ต HTTP | `3000` |
| `MONGO_URI` | URI MongoDB | `mongodb://localhost:27017/pricing_platform` |
| `REDIS_URL` | URI Redis | `redis://localhost:6379` |

ไม่ควร commit ไฟล์ `.env` ที่มีข้อมูลลับขององค์กร

---

## API สรุป

| Method | Path | คำอธิบาย |
|--------|------|----------|
| GET | `/health` | สถานะบริการ |
| POST | `/quotes/price` | คำนวณราคาทันที (JSON body) |
| POST | `/quotes/bulk` | อัปโหลดไฟล์ CSV หรือ JSON (`multipart/form-data`, field **`file`**) |
| GET | `/jobs` | รายการงานแบ่งหน้า |
| GET | `/jobs/:jobId` | ดึงงานตามเลข `jobId` |
| POST/PATCH/DELETE | `/jobs` … | สร้าง/แก้/ลบ (soft) ตามโมดูล jobs |
| GET | `/jobs/syncjson` | ซิงก์จาก `data/jobs.json` |
| — | `/rules/*` | CRUD + list + `syncjson` |
| — | `/products/*` | CRUD + list + `syncjson` |

---

## ตัวอย่างคำขอ

### คำนวณราคาทันที

```http
POST /quotes/price
Content-Type: application/json
```

```json
{
  "quoteAt": "2026-03-29T10:00:00.000Z",
  "items": [
    { "productId": "SKU-001", "quantity": 2 },
    { "productId": "SKU-010", "quantity": 1, "distanceKm": 85 }
  ]
}
```

- `distanceKm` ต่อบรรทัดใช้กับกฎประเภท remote / ระยะทาง

### Bulk (Postman หรือ client ที่รองรับ multipart)

- **URL:** `POST /quotes/bulk`
- **Body:** form-data, key **`file`**, type **File**
- **CSV:** หัวตารางต้องมีอย่างน้อย `request_id`, `product_id`, `quantity` และมีได้ `item_index`, `distance_km` — แถวที่ `request_id` เดียวกันจัดเป็นงานเดียว (หลายบรรทัดสินค้า)
- **JSON:** อาร์เรย์ของงาน หรือ `{ "data": [ ... ] }` — แต่ละงานมี `items` ที่มี `productId`, `quantity` (และฟิลด์อื่นตามที่ระบบรองรับ)

ตัวอย่างไฟล์: `api/data/bulk_quotes.csv`, `api/data/jobs-bulk-test-500.json`

**คำตอบ:** `{ "data": [ Job, ... ] }` — แต่ละ `Job` มี `jobId` เป็นตัวเลข ใช้กับ `GET /jobs/:jobId`

---

## เอกสาร API (Postman)

นำเข้า collection:

`api/postman/Pricing-Platform.postman_collection.json`

ตั้งค่า variable **`baseUrl`** ให้ตรงกับเซิร์ฟเวอร์ของคุณ

แพ็กเกจ `@nestjs/swagger` มีใน `api/package.json` แต่ **ยังไม่ได้เปิด endpoint `/docs`** ใน `main.ts` — ถ้าต้องการ OpenAPI ให้เพิ่มการตั้งค่า Swagger ใน bootstrap

---

## การทดสอบ

จากโฟลเดอร์ `api/`:

```bash
yarn test        # unit tests ใต้ src/**/*.spec.ts
yarn test:e2e    # ต้องมี MongoDB ที่ localhost:27017
yarn test:cov
```

E2E ใช้ฐานชื่อ `pricing_platform_e2e_test` และล้างหลังแต่ละเคส

---

## Sample data (ตาม deliverable)

| ไฟล์ | ใช้ทำอะไร |
|------|------------|
| `api/data/rules.json` | กฎราคา — sync ผ่าน `GET /rules/syncjson` |
| `api/data/products.json` | สินค้า — `GET /products/syncjson` |
| `api/data/bulk_quotes.csv` | ตัวอย่าง bulk CSV |
| `api/data/jobs-bulk-test-500.json` | ตัวอย่าง bulk JSON (อาร์เรย์งานจำนวนมาก) |
| `api/data/jobs.json` | seed งาน — `GET /jobs/syncjson` |

---

## License

ดูค่าใน `api/package.json` (ปัจจุบันระบุ `UNLICENSED`) — ปรับตามนโยบายโปรเจกต์ได้
