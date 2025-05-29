"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal, FileWarning } from "lucide-react";
import type { Document as PDFDocument, Page as PDFPage } from "react-pdf";
import { Document, Page, pdfjs } from "react-pdf";
import type { Dispatch, SetStateAction } from "react";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFState {
  loading: boolean;
  error: string | null;
  pdfUrl: string | null;
  compilationLog: string | null;
  pageNumber: number;
  numPages: number | null;
}

interface ResumePreviewProps {
  latexContent: string;
  pdfState: PDFState;
  setPdfState: Dispatch<SetStateAction<PDFState>>;
}

export default function ResumePreview({ latexContent, pdfState, setPdfState }: ResumePreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number | null>(null);

  // Measure container width
  const onResize = useCallback(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.clientWidth);
    }
  }, []);

  useEffect(() => {
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, [onResize]);

  function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }): void {
    setPdfState(prev => ({
      ...prev,
      numPages: nextNumPages,
      loading: false
    }));
  }

  function onDocumentLoadError(loadError: Error): void {
    console.error("React-PDF Document Load Error:", loadError);
    setPdfState(prev => ({
      ...prev,
      error: `Failed to load PDF: ${loadError.message}`,
      loading: false,
      pdfUrl: null
    }));
  }

  function onPageLoadSuccess(): void {
    onResize();
  }

  function onPageLoadError(loadError: Error): void {
    console.error("React-PDF Page Load Error:", loadError);
    setPdfState(prev => ({
      ...prev,
      error: `Failed to load page ${pdfState.pageNumber}: ${loadError.message}`
    }));
  }

  if (pdfState.loading) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-muted/40">
        <div className="text-center mb-4">
          <h3 className="text-lg font-medium">Compiling LaTeX...</h3>
          <p className="text-sm text-muted-foreground">Generating PDF preview</p>
        </div>
        <div className="w-full max-w-3xl aspect-[8.5/11]">
          <Skeleton className="h-full w-full rounded-md" />
        </div>
      </div>
    );
  }

  if (pdfState.error) {
    return (
      <Alert variant="destructive" className="m-4">
        <FileWarning className="h-4 w-4" />
        <AlertTitle>PDF Generation Error</AlertTitle>
        <AlertDescription>{pdfState.error}</AlertDescription>
      </Alert>
    );
  }

  if (pdfState.pdfUrl) {
    return (
      <div ref={containerRef} className="w-full h-full overflow-y-auto">
        <div className="flex flex-col items-center py-8 px-4">
          <Document
            key={`doc_${pdfState.pdfUrl}`}
            file={pdfState.pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="w-full max-w-3xl aspect-[8.5/11]">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            }
            error={
              <Alert variant="destructive" className="w-full max-w-3xl">
                <FileWarning className="h-4 w-4" />
                <AlertTitle>PDF Load Error</AlertTitle>
                <AlertDescription>{pdfState.error || "Failed to load PDF document."}</AlertDescription>
              </Alert>
            }
            className="flex flex-col items-center gap-4"
          >
            {pdfState.numPages && containerWidth && Array.from(new Array(pdfState.numPages), (_, index) => (
              <Page
                key={`page_${index + 1}`}
                pageNumber={index + 1}
                width={containerWidth * 0.8}
                devicePixelRatio={typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1}
                onLoadSuccess={onPageLoadSuccess}
                onLoadError={() => console.error(`Error loading page ${index + 1}`)}
                loading={
                  <div style={{ width: `${containerWidth * 0.8}px`, aspectRatio: "8.5/11" }}>
                    <Skeleton className="h-full w-full rounded-md" />
                  </div>
                }
                className="mb-4 shadow-md"
              />
            ))}
          </Document>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col items-center justify-center bg-muted/40">
      <div className="text-center mb-4">
        <h3 className="text-lg font-medium">Resume Preview</h3>
        <p className="text-sm text-muted-foreground">Edit LaTeX on the left to generate preview.</p>
      </div>
      <div className="w-full max-w-3xl aspect-[8.5/11]">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
    </div>
  );
} 