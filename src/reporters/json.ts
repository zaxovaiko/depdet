import type { Report } from "../types.ts";

export const renderJson = (report: Report): string => JSON.stringify(report, null, 2);
