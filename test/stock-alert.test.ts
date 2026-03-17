import { describe, expect, it } from "vitest";
import {
  buildSlackMessage,
  findAvailableProducts,
  hasStock,
} from "../src/stock-alert.js";

describe("재고 판단", () => {
  it("재고 수량이 1개 이상이면 재고 있음으로 판단한다", () => {
    expect(
      hasStock({
        stockQty: 2,
        stockStatus: "LOW_STOCK",
      }),
    ).toBe(true);
  });

  it("재고 수량이 0개이고 품절 상태면 재고 없음으로 판단한다", () => {
    expect(
      hasStock({
        stockQty: 0,
        stockStatus: "NO_STOCK",
      }),
    ).toBe(false);
  });
});

describe("재고 상품 추출", () => {
  it("재고가 있는 상품만 추려낸다", () => {
    const availableProducts = findAvailableProducts([
      {
        name: "스위치2 본체 (일반판)",
        skuCode: "4902370552690",
        stockQty: 0,
        stockStatus: "NO_STOCK",
      },
      {
        name: "스위치2 본체:마리오카트 월드세트",
        skuCode: "4902370553048",
        stockQty: 3,
        stockStatus: "LOW_STOCK",
      },
    ]);

    expect(availableProducts).toEqual([
      {
        name: "스위치2 본체:마리오카트 월드세트",
        skuCode: "4902370553048",
        stockQty: 3,
        stockStatus: "LOW_STOCK",
      },
    ]);
  });
});

describe("슬랙 메시지 생성", () => {
  it("재고 있는 상품과 점포 정보를 메시지에 담는다", () => {
    const message = buildSlackMessage({
      checkedAt: "2026-03-17T16:30:00+09:00",
      storeReports: [
        {
          storeName: "트레이더스 홀세일 클럽 마곡점",
          availableProducts: [
            {
              name: "스위치2 본체 (일반판)",
              skuCode: "4902370552690",
              stockQty: 2,
              stockStatus: "LOW_STOCK",
            },
          ],
          unavailableProducts: [],
        },
      ],
    });

    expect(message).toContain("@channel");
    expect(message).toContain("마곡");
    expect(message).toContain("일반판 2개");
    expect(message).toContain("2026-03-17T16:30:00+09:00");
  });

  it("재고가 없어도 각 지점별 품절 현황을 계속 보여준다", () => {
    const message = buildSlackMessage({
      checkedAt: "2026-03-17T16:30:00+09:00",
      storeReports: [
        {
          storeName: "트레이더스 홀세일 클럽 마곡점",
          availableProducts: [],
          unavailableProducts: [
            {
              name: "스위치2 본체 (일반판)",
              skuCode: "4902370552690",
              stockQty: 0,
              stockStatus: "NO_STOCK",
            },
          ],
        },
        {
          storeName: "트레이더스 홀세일 클럽 고양점",
          availableProducts: [],
          unavailableProducts: [
            {
              name: "스위치2 본체:마리오카트 월드세트",
              skuCode: "4902370553048",
              stockQty: 0,
              stockStatus: "NO_STOCK",
            },
          ],
        },
      ],
    });

    expect(message).not.toContain("@channel");
    expect(message).toContain("마곡");
    expect(message).toContain("고양");
    expect(message).toContain("일반판 없음");
    expect(message).toContain("마카세트 없음");
  });
});
