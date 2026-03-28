# Pricing Platform API

แอปพลิเคชัน Backend ด้วย **NestJS** สำหรับจัดการกฎราคา (pricing rules) เก็บใน **MongoDB** และใช้ **Redis** แคชรายการกฎแบบแบ่งหน้า โค้ดหลักอยู่ในโฟลเดอร์ `api/`

---

## ภาพรวม

- **Rules:** CRUD กฎราคา, ซิงก์จาก `data/rules.json` เข้าฐานข้อมูล, รายการแบบแบ่งหน้าพร้อมแคช Redis
- **Health:** ตรวจว่าเซอร์วิสทำงาน
- **Quotes / Jobs:** โมดูลที่สร้างจาก Nest CLI ยังเป็นตัวยึดที่ (placeholder) — ยังไม่มี pricing engine หรือ bulk job ตามสเปกเดิม

---

## เทคโนโลยี

| ส่วน | รายการ |
|------|--------|
| Runtime | Node.js 20+ |
| Framework | NestJS 11 |
| Validation | `class-validator`, `class-transformer`, `ValidationPipe` (global) |
| ฐานข้อมูล | MongoDB + Mongoose (`@nestjs/mongoose`) |
| แคช | Redis (`ioredis`) |
| ทดสอบ | Jest, Supertest, `@nestjs/testing` |
| คอนเทนเนอร์ | Docker Compose (`api`, `mongo`, `redis`) |

> โปรเจกต์นี้ **ไม่ได้** ติดตั้ง Swagger/OpenAPI ใน `package.json` ปัจจุบัน

---

## โครงสร้างโรงงาน

```txt
product/
└─ api/
   ├─ data/
   │  └─ rules.json          # ข้อมูลตัวอย่างสำหรับ sync เข้า MongoDB
   ├─ src/
   │  ├─ app.module.ts
   │  ├─ main.ts
   │  ├─ app.controller.ts   # GET /health
   │  ├─ modules/
   │  │  ├─ rules/           # กฎราคา (หลัก)
   │  │  ├─ quotes/          # scaffold
   │  │  └─ jobs/            # scaffold
   │  └─ shared/redis/       # RedisModule + RedisService
   ├─ test/
   │  └─ app.e2e-spec.ts
   ├─ docker-compose.yml
   ├─ Dockerfile
   ├─ package.json
   └─ yarn.lock
```

---

## ความต้องการของระบบ

รันแบบ local ต้องมี:

- **MongoDB** (ค่าเริ่มต้น `mongodb://localhost:27017/pricing_platform`)
- **Redis** (ค่าเริ่มต้น `redis://localhost:6379`)

รัน E2E ต้องมี MongoDB บน `localhost:27017` (สคริปต์จะใช้ฐานชื่อ `pricing_platform_e2e_test` และล้างหลังแต่ละเคส)

---

## การติดตั้งและรัน (Local)

จากโฟลเดอร์ `api/`:

```bash
yarn install
yarn build
yarn start:dev
```

- พอร์ตเริ่มต้น: `http://localhost:3000` (หรือตาม `PORT`)
- Health: `GET http://localhost:3000/health`

---

## Docker Compose

จากโฟลเดอร์ `api/`:

```bash
docker compose up --build
```

บริการ:

- **api** — พอร์ต `3000`, ตั้ง `MONGO_URI` และ `REDIS_URL` ชี้ไปที่คอนเทนเนอร์ใน compose
- **mongo** — MongoDB 7, พอร์ต `27017`, volume `mongo_data`
- **redis** — Redis 7, พอร์ต `6379`

หยุด:

```bash
docker compose down
```

---

## ตัวแปรสภาพแวดล้อม

| ตัวแปร | ความหมาย | ค่าเริ่มต้น (ถ้าไม่ตั้ง) |
|--------|-----------|---------------------------|
| `PORT` | พอร์ต HTTP | `3000` |
| `MONGO_URI` | URI ของ MongoDB | `mongodb://localhost:27017/pricing_platform` |
| `REDIS_URL` | URI ของ Redis | `redis://localhost:6379` |

> อย่า commit ไฟล์ `.env` ที่มีข้อมูลจริงขององค์กร

---

## API ที่ใช้งานได้จริง

### Health

`GET /health`

ตัวอย่างการตอบกลับ:

```json
{ "message": "service is running OK" }
```

### Rules

| Method | Path | คำอธิบาย |
|--------|------|----------|
| `GET` | `/rules` | รายการแบบแบ่งหน้า (`page`, `pageSize`) เรียง `priority` มากไปน้อย แคช Redis ~30 วินาที |
| `GET` | `/rules/syncjson` | อ่าน `data/rules.json` แล้ว upsert เข้า MongoDB, bump เวอร์ชันแคช |
| `GET` | `/rules/:id` | ดูกฎตาม `id` (ตัวเลข) |
| `POST` | `/rules` | สร้างกฎ (`id` สร้างอัตโนมัติจากลำดับล่าสุด) |
| `PATCH` | `/rules/:id` | แก้ไขกฎ |
| `DELETE` | `/rules/:id` | **ปิดใช้งาน** (soft delete: ตั้ง `is_active: false`) |

Query สำหรับรายการ:

- `page` (optional, default `1`)
- `pageSize` (optional, default `10`)

### โมเดลกฎ (MongoDB collection `pricing_rules`)

ฟิลด์หลัก:

- `id` — ตัวเลข unique (ไม่ใช่ string แบบ `R-WEIGHT-01`)
- `type` — `TimeWindowPromotion` | `RemoteAreaSurcharge` | `WeightTier`
- `method` — `discount` | `surcharge`
- `type_value` — `percent` | `amount`
- `value` — ตัวเลข
- `priority` — ความสำคัญ (ใช้เรียงในรายการ)
- `effective_from`, `effective_to` — ช่วงวันที่มีผล
- `is_active` — เปิด/ปิดใช้งาน
- `name` — ชื่อกฎ

ตัวอย่าง body สำหรับ `POST` / `PATCH`:

```json
{
  "name": "Promo Lunch 10%",
  "type": "TimeWindowPromotion",
  "method": "discount",
  "type_value": "percent",
  "value": 10,
  "priority": 90,
  "effective_from": "2026-01-01T00:00:00.000Z",
  "effective_to": "2026-12-31T23:59:59.000Z",
  "is_active": true
}
```

### Quotes / Jobs

`POST/GET/PATCH/DELETE` ที่ `/quotes` และ `/jobs` ยังคืนข้อความ placeholder จาก Nest scaffold — ยังไม่เชื่อม pricing engine

---

## ข้อมูลตัวอย่าง

- **`api/data/rules.json`** — อาร์เรย์ของกฎ ใช้กับ `GET /rules/syncjson` เพื่อโหลด/อัปเดต MongoDB

หลัง deploy หรือรันครั้งแรก แนะนำเรียก `GET /rules/syncjson` (หรือให้ E2E /สคริปต์จัดการ) เพื่อให้มีข้อมูลกฎในฐานข้อมูล

---

## พฤติกรรมแคช (Redis)

- คีย์เวอร์ชัน `rules:list:version` ใช้ invalidate แคชเมื่อมีการสร้าง/แก้ไข/ลบ (soft)/sync JSON
- แต่ละหน้ารายการถูกแคชแยกตาม `page`, `pageSize`, เวอร์ชัน — TTL 30 วินาที

---

## การทดสอบ

จาก `api/`:

```bash
yarn test          # unit (*.spec.ts ใน src)
yarn test:e2e      # ต้องมี MongoDB (และ Redis ถ้าแอปเชื่อมตอนรัน)
yarn test:cov      # coverage
```

E2E (`test/app.e2e-spec.ts`) ครอบคลุม `/health`, rules list/detail/sync, CRUD rules บางเส้นทาง

---

## สิ่งที่อาจพัฒนาต่อ (จากสเปกเดิม)

- Pricing engine + `POST /quotes/price` คำนวณจากกฎจริง
- Bulk quote + job tracking (`job_id`, สถานะ queued/completed)
- Swagger ที่ `/docs`, structured logging + `trace_id`
- ปรับ quotes/jobs ให้สอดคล้องโดเมน

---

## License

ค่าใน `api/package.json` ระบุ `UNLICENSED` — ปรับตามนโยบายของโปรเจกต์ได้
