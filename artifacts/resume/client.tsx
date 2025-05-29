import { Artifact, type UIArtifact } from "@/components/create-artifact";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, FileText, Copy, X, Download } from "lucide-react";
import dynamic from "next/dynamic";
import LatexEditor from "@/components/latex-editor";
import { toast } from "sonner";
import { LayoutTemplate } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useRef } from "react";
import { useArtifact } from "@/hooks/use-artifact";

// State interface for PDF compilation
interface PDFState {
  loading: boolean;
  error: string | null;
  pdfUrl: string | null;
  compilationLog: string | null;
  pageNumber: number;
  numPages: number | null;
}

// Dynamically import ResumePreview with SSR disabled
const ResumePreview = dynamic(() => import("@/components/resume-preview"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-muted/40">
      <div className="text-center">
        <LayoutTemplate className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
        <p className="mt-2 text-sm text-gray-500">Loading Preview...</p>
      </div>
    </div>
  ),
});

interface Metadata {
  isReadOnly: boolean;
  activeTab: "latex" | "preview";
  parentContentSyncCallback?: (content: string) => void;
}

// Detect LaTeX content in text
function detectLatexContent(text: string): string | null {
  const latexMatch = text.match(/```latex\n([\s\S]*?)(?:\n```|$)/);
  return latexMatch ? latexMatch[1] : null;
}

export const resumeArtifact = new Artifact<"resume", Metadata>({
  kind: "resume",
  description: "LaTeX resume editor and PDF preview",

  initialize: async ({ setMetadata }) => {
    setMetadata({
      isReadOnly: false,
      activeTab: "latex",
    });
  },

  onStreamPart: ({ streamPart, setArtifact, setMetadata }) => {
    if (streamPart.type === "text-delta") {
      const content = streamPart.content as string;
      const latexContent = detectLatexContent(content);

      if (latexContent) {
        setArtifact((draftArtifact: UIArtifact) => ({
          ...draftArtifact,
          content: latexContent,
          isVisible: true,
          status: "streaming",
          title: "Resume Builder",
          kind: "resume",
        }));

        setMetadata((metadata: Metadata) => {
          if (metadata.parentContentSyncCallback) {
            metadata.parentContentSyncCallback(latexContent);
          }
          return {
            ...metadata,
            isReadOnly: true,
            activeTab: "latex",
          };
        });
      }
    } else if (streamPart.type === "latex-delta") {
      setArtifact((draftArtifact: UIArtifact) => ({
        ...draftArtifact,
        content: draftArtifact.content + (streamPart.content as string),
        isVisible: true,
        status: "streaming",
      }));

      setMetadata((metadata: Metadata) => ({
        ...metadata,
        isReadOnly: true,
        activeTab: "latex",
      }));
    } else if (streamPart.type === "finish") {
      setArtifact((draftArtifact: UIArtifact) => ({
        ...draftArtifact,
        status: "idle",
      }));

      setMetadata((metadata: Metadata) => ({
        ...metadata,
        isReadOnly: false,
      }));
    }
  },

  content: ({ content, onSaveContent, metadata, setMetadata, status }) => {
    const [isFullscreen, setIsFullscreen] = useState(false);
    const { setArtifact } = useArtifact();

    // PDF Preview states
    const [pdfState, setPdfState] = useState<PDFState>({
      loading: true,
      error: null,
      pdfUrl: null,
      compilationLog: null,
      pageNumber: 1,
      numPages: null
    });
    const previousPdfUrlRef = useRef<string | null>(null);

    // PDF compilation effect
    useEffect(() => {
      const handler = setTimeout(() => {
        if (!content) {
          setPdfState(prev => ({
            ...prev,
            loading: false,
            error: "No LaTeX content provided.",
            pdfUrl: null,
            compilationLog: null
          }));
          return;
        }

        setPdfState(prev => ({
          ...prev,
          loading: true,
          error: null,
          pdfUrl: null,
          compilationLog: null
        }));

        const compileLatex = async () => {
          try {
            const response = await fetch("/api/compile-latex", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ latexSource: content }),
            });

            if (!response.ok) {
              let errorData: { error: string; log: string; details: string };
              try {
                errorData = await response.json();
              } catch (parseError) {
                throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
              }
              console.error("Compilation Error Data:", errorData);
              setPdfState(prev => ({
                ...prev,
                error: errorData.error || `Compilation failed with status ${response.status}`,
                compilationLog: errorData.log || errorData.details || "No details available.",
                pdfUrl: null,
                loading: false
              }));
            } else {
              const pdfBlob = await response.blob();
              const newObjectUrl = URL.createObjectURL(pdfBlob);

              if (previousPdfUrlRef.current) {
                URL.revokeObjectURL(previousPdfUrlRef.current);
              }

              previousPdfUrlRef.current = newObjectUrl;
              setPdfState(prev => ({
                ...prev,
                pdfUrl: newObjectUrl,
                error: null,
                compilationLog: null,
                pageNumber: 1,
                numPages: null,
                loading: false
              }));
            }
          } catch (err: any) {
            console.error("Failed to fetch or compile LaTeX:", err);
            setPdfState(prev => ({
              ...prev,
              error: `Failed to compile: ${err.message}`,
              compilationLog: err.toString(),
              pdfUrl: null,
              loading: false
            }));
          }
        };

        compileLatex();
      }, 1000);

      return () => {
        clearTimeout(handler);
      };
    }, [content]);

    // Cleanup object URL on unmount
    useEffect(() => {
      return () => {
        if (previousPdfUrlRef.current) {
          URL.revokeObjectURL(previousPdfUrlRef.current);
          previousPdfUrlRef.current = null;
        }
      };
    }, []);

    const handleTabChange = (value: string) => {
      if (setMetadata) {
        setMetadata({
          ...metadata,
          activeTab: value as "latex" | "preview",
        });
      }
    };

    const handleEditorChange = (newContent: string) => {
      onSaveContent(newContent);
      if (metadata?.parentContentSyncCallback) {
        metadata.parentContentSyncCallback(newContent);
      }
    };

    const handleCopyToClipboard = () => {
      navigator.clipboard.writeText(content);
      toast.success("Content copied to clipboard");
    };

    const handleClose = () => {
      setArtifact((current) => ({ ...current, isVisible: false }));
      if (metadata?.parentContentSyncCallback) {
        metadata.parentContentSyncCallback("");
      }
    };

    const toggleFullscreen = () => {
      setIsFullscreen(!isFullscreen);
    };

    return (
      <div className="flex flex-col h-full">
        <Tabs
          value={metadata?.activeTab || "latex"}
          onValueChange={handleTabChange}
          className="flex-1 flex flex-col h-full"
        >
          <div className="border-b px-2 sm:px-4 py-1 sm:py-2 flex justify-between items-center">
            <TabsList className="h-8 sm:h-10 mt-0 sm:mt-2">
              <TabsTrigger value="latex" className="h-8 sm:h-9 px-2.5 sm:px-3 text-sm sm:text-base data-[state=active]:font-medium justify-center gap-2">
                <Code className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                LaTeX
              </TabsTrigger>
              <TabsTrigger value="preview" className="h-8 sm:h-9 px-2.5 sm:px-3 text-sm sm:text-base data-[state=active]:font-medium justify-center gap-2">
                <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Preview
              </TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button 
                size="sm" 
                className="h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-medium"
                variant="default"
              >
                <Download className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyToClipboard}
                title="Copy to clipboard"
                className="h-8 w-8"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                title="Close"
                className="h-8 w-8"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          <div className={`flex-1 overflow-hidden ${isFullscreen ? "fixed inset-0 z-50 pt-16 bg-background" : ""}`}>
            <TabsContent
              value="latex"
              className="h-full m-0 data-[state=active]:flex data-[state=active]:flex-col"
            >
              <div className="h-full flex-1 overflow-hidden">
                <LatexEditor
                  content={content || ""}
                  onChange={handleEditorChange}
                  readOnly={metadata?.isReadOnly || false}
                />
              </div>
            </TabsContent>

            <TabsContent
              value="preview"
              className="h-full m-0 bg-gray-50 overflow-auto"
            >
              <ResumePreview latexContent={content || ""} pdfState={pdfState} setPdfState={setPdfState} />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    );
  },

  actions: [
    {
      icon: <Copy size={18} />,
      description: "Copy LaTeX to clipboard",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard!");
      },
    },
  ],

  toolbar: [],
});
