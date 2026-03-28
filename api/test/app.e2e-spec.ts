import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

const E2E_DB_NAME = `pricing_platform_e2e_test`;
process.env.MONGO_URI = `mongodb://localhost:27017/${E2E_DB_NAME}`;

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  let mongoConnection: Connection;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    mongoConnection = moduleFixture.get<Connection>(getConnectionToken());
    await app.init();

    await request(app.getHttpServer())
      .get('/rules/syncjson')
      .expect(200)
      .expect({ message: 'Synced JSON data successfully' });
  });

  afterEach(async () => {
    if (mongoConnection.db) {
      await mongoConnection.db.dropDatabase();
    }
    await app.close();
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ message: 'service is running OK' });
  });

  it('/rules (GET)', () => {
    return request(app.getHttpServer())
      .get('/rules')

      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          page: 1,
          pageSize: 10,
          total: expect.any(Number),
          data: expect.any(Array),
        });

        expect(res.body.total).toBeGreaterThanOrEqual(res.body.data.length);
        expect(res.body.data.length).toBeLessThanOrEqual(10);
        if (res.body.data.length > 0) {
          expect(res.body.data[0]).toHaveProperty('id', expect.any(Number));
        }
      });
  });

  it('/rules/:id (GET)', () => {
    return request(app.getHttpServer())
      .get('/rules/1')
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          id: 1,
        });
      });
  });

  it('/rules/syncjson (GET)', () => {
    return request(app.getHttpServer())
      .get('/rules/syncjson')
      .expect(200)
      .expect({ message: 'Synced JSON data successfully' });
  });

  it('/rules/:id (PATCH)', () => {
    const payload = {
      name: 'Test',
      type: 'TimeWindowPromotion',
      method: 'discount',
      type_value: 'percent',
      value: 10,
      priority: 1,
      effective_from: new Date(),
      effective_to: new Date(),
      is_active: true,
    };
    const expectedPayload = {
      ...payload,
      effective_from: payload.effective_from.toISOString(),
      effective_to: payload.effective_to.toISOString(),
    };

    return request(app.getHttpServer())
      .patch('/rules/1')
      .send(payload)
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          id: 1,
          ...expectedPayload,
        });
      });
  });

  it('/rules/:id (DELETE)', () => {
    return request(app.getHttpServer())
      .delete('/rules/1')
      .expect(200)
      .then((res) => {
        expect(res.body).toMatchObject({
          id: 1,
        });
      });
  });

  it('/rules (POST)', () => {
    const payload = {
      name: 'Test',
      type: 'TimeWindowPromotion',
      method: 'discount',
      type_value: 'percent',
      value: 10,
      priority: 1,
      effective_from: new Date(),
      effective_to: new Date(),
      is_active: true,
    };
    const expectedPayload = {
      ...payload,
      effective_from: payload.effective_from.toISOString(),
      effective_to: payload.effective_to.toISOString(),
    };

    return request(app.getHttpServer())
      .post('/rules')
      .send(payload)
      .expect(201)
      .then((res) => {
        expect(res.body).toMatchObject({
          ...expectedPayload,
          id: expect.any(Number),
        });
      });
  });
});
