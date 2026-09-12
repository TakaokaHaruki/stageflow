import { base44 } from "@/api/base44Client";

const PAGE_SIZE = 5000; // SDKの1リクエスト最大取得件数
const MAX_PAGES = 40; // 安全弁（最大20万件）

/**
 * エンティティのレコードをページ送りで全件取得する。
 * SDKは1リクエスト最大5,000件のため、skipを進めながら取得し尽くす。
 * @param {string} entityName base44.entities 配下のエンティティ名
 * @param {{ query?: object, sort?: string }} options
 */
export async function fetchAllRecords(entityName, { query = {}, sort = "-created_date" } = {}) {
  const entity = base44.entities[entityName];
  const all = [];
  for (let skip = 0; skip < PAGE_SIZE * MAX_PAGES; skip += PAGE_SIZE) {
    const page = await entity.filter(query, sort, PAGE_SIZE, skip);
    if (!page || page.length === 0) break;
    all.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return all;
}