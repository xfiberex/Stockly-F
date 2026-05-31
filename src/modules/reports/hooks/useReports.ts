import { useQuery } from "@tanstack/react-query";
import { getReportSummary } from "../api/reports.api";

export function useReports() {
    return useQuery({
        queryKey: ["reports"],
        queryFn: getReportSummary,
        staleTime: 30_000,
    });
}
