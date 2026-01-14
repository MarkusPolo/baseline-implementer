'use client';

import React, { useState, useRef } from 'react';
import { X, Upload, Download, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { parseCSV, normalizeHeaders, generateSampleCSV } from '@/lib/csv-utils';

interface CSVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (data: any[]) => void;
    templateSchema: any;
}

export default function CSVImportModal({ isOpen, onClose, onImport, templateSchema }: CSVImportModalProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) processFile(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const processFile = async (file: File) => {
        if (!file.name.endsWith('.csv')) {
            setError('Please upload a valid CSV file.');
            return;
        }

        try {
            const rows = await parseCSV(file);
            const importedData = rows.map(row => normalizeHeaders(row));
            onImport(importedData);
            onClose();
        } catch (err) {
            console.error(err);
            setError('Failed to parse CSV file. Please check the format.');
        }
    };

    const downloadSample = () => {
        const properties = templateSchema?.properties || {};
        const blob = generateSampleCSV(properties);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'import_template.csv';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Content */}
            <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900 shadow-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between border-b border-neutral-800 p-4">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-lg font-bold text-white">Import Configuration</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Drag & Drop Zone */}
                    <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        className={`group relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-all ${isDragging
                                ? "border-blue-500 bg-blue-500/10"
                                : "border-neutral-800 bg-neutral-950/50 hover:border-neutral-700"
                            }`}
                    >
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept=".csv"
                            className="hidden"
                        />

                        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-neutral-900 border border-neutral-800 group-hover:bg-neutral-800 transition-colors">
                            <Upload className={`h-8 w-8 ${isDragging ? "text-blue-500" : "text-neutral-500"}`} />
                        </div>

                        <div className="text-center">
                            <p className="text-sm font-medium text-white">
                                Drop your CSV here, or{" "}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-blue-500 hover:underline"
                                >
                                    browse
                                </button>
                            </p>
                            <p className="mt-1 text-xs text-neutral-500">
                                Only .csv files are supported
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 p-3 text-sm text-rose-500 border border-rose-500/20">
                            <AlertCircle className="h-4 w-4" />
                            {error}
                        </div>
                    )}

                    <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
                                <Download className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-white">Sample Template</h4>
                                <p className="mt-1 text-xs text-neutral-500 leading-relaxed">
                                    Download a CSV file pre-formatted with all variables from the selected template. Just fill it in and re-upload.
                                </p>
                                <button
                                    onClick={downloadSample}
                                    className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors"
                                >
                                    Download Example CSV
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end border-t border-neutral-800 bg-neutral-950/50 p-4">
                    <button
                        onClick={onClose}
                        className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-400 hover:text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
