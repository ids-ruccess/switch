import { buildSlackMessage, findAvailableProducts } from "./stock-alert.js";
import type { ProductStockSnapshot, StoreReport } from "./stock-alert.js";

type StockBranchApiResponse = {
  status: number;
  message: string;
  data: {
    stockStatus: string;
    stockQty: number;
  } | null;
};

const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

const watchedStores = [
  {
    id: "2023",
    name: "트레이더스 홀세일 클럽 마곡점",
  },
  {
    id: "2012",
    name: "트레이더스 홀세일 클럽 고양점",
  },
  {
    id: "2017",
    name: "트레이더스 홀세일 클럽 부천점",
  },
  {
    id: "2014",
    name: "트레이더스 홀세일 클럽 김포점",
  },
  {
    id: "2010",
    name: "트레이더스 홀세일 클럽 일산점",
  },
] as const;

const watchedProducts = [
  {
    skuCode: "4902370552690",
    name: "스위치2 본체 (일반판)",
  },
  {
    skuCode: "4902370553048",
    name: "스위치2 본체:마리오카트 월드세트",
  },
] as const;

async function fetchProductStockForStore(
  storeId: string,
  product: (typeof watchedProducts)[number],
): Promise<ProductStockSnapshot> {
  const query = new URLSearchParams({
    storeType: "T",
    skuCode: product.skuCode,
  });
  const response = await fetch(
    `https://api-eapp.emart.com/search/api/v1/store/stock/branch/${storeId}?${query.toString()}`,
  );

  if (!response.ok) {
    throw new Error(`재고 조회 실패: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as StockBranchApiResponse;

  if (payload.status !== 200) {
    throw new Error(`재고 조회 실패: ${payload.message}`);
  }

  return {
    skuCode: product.skuCode,
    name: product.name,
    stockQty: payload.data?.stockQty ?? 0,
    stockStatus: payload.data?.stockStatus ?? "NO_STOCK",
  };
}

async function fetchStoreReport(
  store: (typeof watchedStores)[number],
): Promise<StoreReport> {
  const productSnapshots = await Promise.all(
    watchedProducts.map((product) => fetchProductStockForStore(store.id, product)),
  );

  const availableProducts = findAvailableProducts(productSnapshots);
  const unavailableProducts = productSnapshots.filter(
    (productSnapshot) =>
      !availableProducts.some(
        (availableProduct) => availableProduct.skuCode === productSnapshot.skuCode,
      ),
  );

  return {
    storeName: store.name,
    availableProducts,
    unavailableProducts,
  };
}

async function postSlackMessage(message: string) {
  if (!slackWebhookUrl) {
    throw new Error("SLACK_WEBHOOK_URL 환경변수가 필요합니다.");
  }

  const response = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text: message,
    }),
  });

  if (!response.ok) {
    throw new Error(`슬랙 전송 실패: HTTP ${response.status}`);
  }
}

async function main() {
  const storeReports = await Promise.all(watchedStores.map(fetchStoreReport));

  const message = buildSlackMessage({
    checkedAt: new Date().toISOString(),
    storeReports,
  });

  await postSlackMessage(message);
  console.log("슬랙 현황 알림 전송 완료");
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
  console.error(message);
  process.exitCode = 1;
});
