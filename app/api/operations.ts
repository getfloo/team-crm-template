import { operations as activities } from "./activities/openapi";
import { operations as companies } from "./companies/openapi";
import { operations as contacts } from "./contacts/openapi";
import { operations as deals } from "./deals/openapi";

// Every /api route's operations, in one list, feeding /api/openapi.json and
// /api-docs. tests/openapi.test.ts fails when a route handler is missing from it.
export const operations = [...companies, ...contacts, ...deals, ...activities];
