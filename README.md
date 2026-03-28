# ระบบคำนวณราคา (Quote Pricing Service)

บริการ Backend สำหรับคำนวณราคาค่าบริการตามกฎ (Pricing Rules) ที่ปรับเปลี่ยนได้ โดยออกแบบให้รองรับการขยายระบบในอนาคต (microservice-ready) และสามารถรีวิวคุณภาพโค้ด/สถาปัตยกรรมได้จาก GitHub repository

---

## 1) Objective

พัฒนาระบบ backend ขนาดเล็กสำหรับคำนวณราคา (quote) จากกฎที่กำหนดได้ (configurable rules) โดยเน้น:

- ความถูกต้องของ logic การคิดราคา
- การออกแบบที่เป็นโมดูลและขยายต่อได้ง่าย
- ความพร้อมใช้งานในเชิงปฏิบัติการ (Docker, health check, test, docs)

---

## 2) Tech Stack (NestJS)

> โครงการนี้เลือกใช้ **Node.js + TypeScript + NestJS**

- Runtime: Node.js 20+
- Framework: NestJS
- Validation: class-validator + class-transformer (พร้อม ValidationPipe)
- Storage: In-memory / JSON file / SQLite (ไม่เชื่อมต่อ real DB)
- API Docs: Swagger (OpenAPI) ผ่าน `@nestjs/swagger`
- Testing (NestJS): `@nestjs/testing` + Jest + Supertest
- Container: Docker + Docker Compose

---

## 3) ขอบเขตระบบ (System Scope)

ระบบประกอบด้วย 2 ส่วนหลัก:

1. **Pricing API**
   - `POST /quotes/price` คำนวณราคาทันทีจาก payload
   - `POST /quotes/bulk` ส่งหลายคำขอพร้อมกัน (CSV/JSON) และคืน `job_id`
   - `GET /jobs/{job_id}` ติดตามสถานะงานและดูผลลัพธ์
   - `GET /health` ตรวจสอบสถานะระบบ

2. **Rule Service / Rule Module**
   - CRUD สำหรับกฎราคา
   - ประเภทกฎขั้นต่ำ:
     - `TimeWindowPromotion`
     - `RemoteAreaSurcharge`
     - `WeightTier`
   - metadata ที่ต้องมีในกฎ:
     - `priority`
     - `effective_from`
     - `effective_to`
     - `is_active`

---

## 4) ภาพรวมสถาปัตยกรรม (NestJS Modular)

แนวทาง: **Modular Monolith (Microservice-ready)**

- `quote` module: รับคำขอและประสานงานการคำนวณราคา (`QuoteController`, `QuoteService`)
- `rule` module: จัดการกฎราคาและ lifecycle ของกฎ (`RuleController`, `RuleService`)
- `pricing-engine` module: ใช้ rule evaluator หลายตัวตามชนิดกฎ
- `job` module: จัดการ bulk jobs และสถานะงาน (`JobController`, `JobService`)
- `health` module: endpoint สุขภาพระบบ
- `shared` module: dto, errors, utils, logger, config

หลักการออกแบบ:

- แยก **Domain Logic** ออกจาก API layer ชัดเจน
- รองรับการเพิ่มกฎชนิดใหม่โดยไม่แก้โค้ดเดิมมาก (Open/Closed)
- มี interface/contract ระหว่าง module เพื่อแยก dependency

---

## 5) โครงสร้างโฟลเดอร์ (NestJS แนะนำ)

```txt
.
├─ .docker/
│  └─ entrypoint.sh
├─ data/
│  ├─ rules.json
│  └─ bulk_quotes.csv
├─ docs/
│  └─ postman_collection.json (optional)
├─ src/
│  ├─ app.module.ts
│  ├─ main.ts
│  ├─ config/
│  │  ├─ app.config.ts
│  │  └─ validation.schema.ts
│  ├─ common/
│  │  ├─ constants/
│  │  ├─ decorators/
│  │  ├─ filters/
│  │  ├─ interceptors/
│  │  └─ pipes/
│  ├─ modules/
│  │  ├─ quote/
│  │  │  ├─ quote.module.ts
│  │  │  ├─ quote.controller.ts
│  │  │  ├─ quote.service.ts
│  │  │  ├─ dto/
│  │  │  │  ├─ price-quote.request.dto.ts
│  │  │  │  └─ price-quote.response.dto.ts
│  │  │  └─ interfaces/
│  │  ├─ rule/
│  │  │  ├─ rule.module.ts
│  │  │  ├─ rule.controller.ts
│  │  │  ├─ rule.service.ts
│  │  │  ├─ dto/
│  │  │  ├─ entities/
│  │  │  └─ repositories/
│  │  ├─ pricing-engine/
│  │  │  ├─ pricing-engine.module.ts
│  │  │  ├─ pricing-engine.service.ts
│  │  │  ├─ evaluators/
│  │  │  │  ├─ time-window-promotion.evaluator.ts
│  │  │  │  ├─ remote-area-surcharge.evaluator.ts
│  │  │  │  └─ weight-tier.evaluator.ts
│  │  │  └─ interfaces/
│  │  ├─ job/
│  │  │  ├─ job.module.ts
│  │  │  ├─ job.controller.ts
│  │  │  ├─ job.service.ts
│  │  │  ├─ dto/
│  │  │  └─ processors/
│  │  └─ health/
│  │     ├─ health.module.ts
│  │     └─ health.controller.ts
│  └─ shared/
│     ├─ errors/
│     ├─ logger/
│     ├─ types/
│     └─ utils/
├─ test/
│  ├─ unit/
│  │  ├─ pricing-engine/
│  │  └─ rule/
│  └─ e2e/
│     ├─ quote.e2e-spec.ts
│     └─ job.e2e-spec.ts
├─ .env.example
├─ Dockerfile
├─ docker-compose.yml
├─ nest-cli.json
├─ tsconfig.json
├─ tsconfig.build.json
├─ package.json
└─ README.md
```

แนวทางการแยกโฟลเดอร์:

- แยกตาม `module` ก่อน แล้วแยกย่อย `dto`, `entities`, `repositories`, `interfaces`
- เก็บของที่ใช้ข้ามโมดูลไว้ใน `src/shared` หรือ `src/common`
- โค้ด core logic ของการคิดราคาให้อยู่ใน `pricing-engine/evaluators` เพื่อ test ได้ง่าย
- e2e test แยกจาก unit test ชัดเจนใน `test/e2e`

---

## 6) การติดตั้งและการรัน

### 6.1 รันแบบ Local

```bash
npm install
npm run build
npm run start:dev
```

ค่าเริ่มต้น:

- API Base URL: `http://localhost:3000`
- Swagger: `http://localhost:3000/docs`
- Health Check: `http://localhost:3000/health`

### 6.2 รันด้วย Docker

```bash
docker compose up --build
```

หยุดการทำงาน:

```bash
docker compose down
```

---

## 7) Environment Variables (ตัวอย่าง)

```env
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DATA_STORE_MODE=json
DATA_STORE_PATH=./data
```

> หมายเหตุ: ระบบนี้ไม่เชื่อมต่อฐานข้อมูลจริงตาม requirement

---

## 8) API Endpoints

### 8.1 คำนวณราคาทันที

`POST /quotes/price`

Request (ตัวอย่าง):

```json
{
  "customer_id": "CUST-001",
  "base_price": 120,
  "weight_kg": 8.5,
  "area_code": "REMOTE-A1",
  "request_time": "2026-03-26T10:30:00Z"
}
```

Response (ตัวอย่าง):

```json
{
  "final_price": 138,
  "currency": "THB",
  "applied_rules": [
    {
      "rule_id": "R-WEIGHT-01",
      "type": "WeightTier",
      "impact": 10
    },
    {
      "rule_id": "R-REMOTE-01",
      "type": "RemoteAreaSurcharge",
      "impact": 8
    }
  ],
  "trace_id": "8b7f0e5c-...."
}
```

### 8.2 ส่งคำขอแบบ Bulk

`POST /quotes/bulk` (รองรับ JSON หรือ CSV)

Response (ตัวอย่าง):

```json
{
  "job_id": "JOB-20260326-0001",
  "status": "queued"
}
```

### 8.3 ตรวจสถานะงาน

`GET /jobs/{job_id}`

Response (ตัวอย่าง):

```json
{
  "job_id": "JOB-20260326-0001",
  "status": "completed",
  "total": 3,
  "processed": 3,
  "results": [
    { "index": 1, "final_price": 138 },
    { "index": 2, "final_price": 115 },
    { "index": 3, "final_price": 172 }
  ]
}
```

### 8.4 Health Check

`GET /health`

Response:

```json
{
  "status": "ok",
  "uptime_sec": 12345
}
```

---

## 9) Rule Management (CRUD)

ตัวอย่าง endpoints:

- `GET /rules`
- `GET /rules/{id}`
- `POST /rules`
- `PUT /rules/{id}`
- `DELETE /rules/{id}`

ตัวอย่าง Rule:

```json
{
  "id": "R-WEIGHT-01",
  "type": "WeightTier",
  "priority": 20,
  "is_active": true,
  "effective_from": "2026-01-01T00:00:00Z",
  "effective_to": "2026-12-31T23:59:59Z",
  "config": {
    "tiers": [
      { "min": 0, "max": 5, "surcharge": 0 },
      { "min": 5, "max": 10, "surcharge": 10 },
      { "min": 10, "max": 9999, "surcharge": 25 }
    ]
  }
}
```

---

## 10) แนวทาง Pricing Logic

ลำดับการทำงานโดยย่อ:

1. รับ payload และ validate schema
2. โหลดกฎที่ active + อยู่ในช่วง effective date
3. เรียงกฎตาม `priority` (มากไปน้อย หรือเงื่อนไขตามที่กำหนด)
4. ประเมินกฎทีละตัวผ่าน pricing engine
5. รวมผลกระทบราคา (discount/surcharge)
6. คืน `final_price` + `applied_rules`

ข้อควรระวัง:

- ป้องกันราคาติดลบ
- รองรับกฎซ้อนกัน (stackable/non-stackable)
- ทำผลลัพธ์ให้ deterministic จากลำดับ `priority`

---

## 11) Testing

เครื่องมือทดสอบที่ใช้ในโปรเจกต์นี้ (ตามแนวทาง NestJS):

- `@nestjs/testing` สำหรับสร้าง TestingModule และ mock dependencies
- `jest` สำหรับ unit/integration test runner
- `supertest` สำหรับทดสอบ HTTP endpoints แบบ e2e

### Unit Tests

- ทดสอบ rule evaluators แยกตามชนิดกฎ
- ทดสอบ edge cases เช่น:
  - เวลานอกช่วงโปรโมชั่น
  - น้ำหนักอยู่ขอบ tier
  - พื้นที่ไม่อยู่ใน remote list

### Integration / E2E Tests (อย่างน้อย 1-2 รายการ)

- `POST /quotes/price` ควรคืนผลลัพธ์ถูกต้องตามกฎที่กำหนด
- `POST /quotes/bulk` + `GET /jobs/{job_id}` ควรเปลี่ยนสถานะจาก queued -> completed

รันเทส:

```bash
npm run test
npm run test:e2e
npm run test:cov
```

---

## 12) API Documentation

รองรับได้ 2 รูปแบบ (ใน NestJS ใช้ Swagger เป็นหลัก):

- Swagger/OpenAPI ที่ `/docs`
- หรือ Postman Collection ใน `docs/postman_collection.json`

---

## 13) Sample Data

จัดเตรียมไฟล์ตัวอย่าง:

- `data/rules.json` รายการกฎตั้งต้น
- `data/bulk_quotes.csv` ข้อมูลสำหรับ bulk processing

---

## 14) Operational Readiness

รายการที่รองรับ:

- Dockerfile และ docker-compose สำหรับรันได้ทันที
- Structured logging พร้อม `trace_id`/`correlation_id`
- Error handling แบบมาตรฐาน (4xx/5xx)
- ENV config ที่ชัดเจน
- Health endpoint สำหรับตรวจ readiness/liveness

---

## 15) Mapping กับ Evaluation Criteria

- **Correctness & Coverage (35):** ออกแบบ rule engine + test ครอบคลุม edge cases
- **Design & Architecture (20):** แยกโมดูลชัดเจน และพร้อมแยก service ในอนาคต
- **Code Quality (15):** โครงสร้างอ่านง่าย, reusable, maintainable
- **Testing (15):** มีทั้ง unit และ integration tests
- **Operational Readiness (10):** docker + logging + env + error handling
- **Docs & DX (5):** README ชัดเจน พร้อมตัวอย่างใช้งาน

---

## 16) Bonus (Optional)

- เพิ่ม worker แยกสำหรับ bulk jobs
- เพิ่ม observability (metrics, tracing)
- เพิ่ม rate limiting / retry policy
- เพิ่ม CI pipeline (lint + test)
- เพิ่ม frontend แสดงผล quote และ job status

---

## 17) ระยะเวลาดำเนินการ

วางแผนให้เสร็จภายใน 3–5 วัน (ประมาณ 15–30 ชั่วโมง):

- Day 1: ตั้งโครงโปรเจกต์ + rule CRUD + basic pricing
- Day 2: bulk job + job tracking + tests
- Day 3: docker + docs + sample data + polishing
- Day 4-5 (buffer): ปรับปรุงคุณภาพ/เพิ่ม bonus

---

## 18) License

สำหรับงานทดสอบสามารถกำหนดเป็น MIT หรือระบุเป็น private assignment ตามเงื่อนไขผู้ประเมิน

