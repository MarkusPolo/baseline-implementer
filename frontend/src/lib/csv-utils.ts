import Papa from "papaparse";

export type CSVRow = Record<string, string>;

export const parseCSV = (file: File): Promise<CSVRow[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data as CSVRow[]);
            },
            error: (error) => {
                reject(error);
            },
        });
    });
};

export const normalizeHeaders = (row: CSVRow): CSVRow => {
    const normalized: CSVRow = {};
    for (const [key, value] of Object.entries(row)) {
        // Basic normalization: lowercase, remove spaces to match schema keys roughly
        // In a real app, this would be a smart mapper or UI-driven mapper
        const cleanKey = key.toLowerCase().trim().replace(/[\s_]+/g, "_"); // e.g. "Mgmt IP" -> "mgmt_ip"
        normalized[cleanKey] = value;
    }
    return normalized;
};
