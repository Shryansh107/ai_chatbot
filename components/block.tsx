import type {
  Attachment,
  ChatRequestOptions,
  CreateMessage,
  Message,
} from 'ai';
import cx from 'classnames';
import { formatDistance } from 'date-fns';
import { AnimatePresence, motion } from 'framer-motion';
import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useEffect,
  useState,
} from 'react';
import { toast } from 'sonner';
import useSWR, { useSWRConfig } from 'swr';
import {
  useCopyToClipboard,
  useDebounceCallback,
  useWindowSize,
} from 'usehooks-ts';

import type { Document, Suggestion, Vote } from '@/lib/db/schema';
import { fetcher } from '@/lib/utils';

import { DiffView } from './diffview';
import { DocumentSkeleton } from './document-skeleton';
import { Editor } from './editor';
import { CopyIcon, CrossIcon, DeltaIcon, RedoIcon, UndoIcon, CodeIcon, FileIcon } from './icons';
import { PreviewMessage } from './message';
import { MultimodalInput } from './multimodal-input';
import { Toolbar } from './toolbar';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { useScrollToBottom } from './use-scroll-to-bottom';
import { VersionFooter } from './version-footer';
import LatexEditor from './latex-editor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import ResumePreview from './resume-preview';
// import 'katex/dist/katex.min.css';

// Function to detect LaTeX content in messages
function detectLatexContent(text: string): string | null {
  const latexMatch = text.match(/```latex\n([\s\S]*?)(?:\n```|$)/);
  return latexMatch ? latexMatch[1] : null;
}

export interface UIBlock {
  title: string;
  documentId: string;
  content: string;
  isVisible: boolean;
  status: 'streaming' | 'idle';
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  isLatex?: boolean;
}

interface PDFState {
  loading: boolean;
  error: string | null;
  pdfUrl: string | null;
  compilationLog: string | null;
  pageNumber: number;
  numPages: number | null;
}

export function Block({
  chatId,
  input,
  setInput,
  handleSubmit,
  isLoading,
  stop,
  attachments,
  setAttachments,
  append,
  block,
  setBlock,
  messages,
  setMessages,
  votes,
}: {
  chatId: string;
  input: string;
  setInput: (input: string) => void;
  isLoading: boolean;
  stop: () => void;
  attachments: Array<Attachment>;
  setAttachments: Dispatch<SetStateAction<Array<Attachment>>>;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  messages: Array<Message>;
  setMessages: Dispatch<SetStateAction<Array<Message>>>;
  votes: Array<Vote> | undefined;
  append: (
    message: Message | CreateMessage,
    chatRequestOptions?: ChatRequestOptions,
  ) => Promise<string | null | undefined>;
  handleSubmit: (
    event?: {
      preventDefault?: () => void;
    },
    chatRequestOptions?: ChatRequestOptions,
  ) => void;
}) {
  const [messagesContainerRef, messagesEndRef] =
    useScrollToBottom<HTMLDivElement>();

  const {
    data: documents,
    isLoading: isDocumentsFetching,
    mutate: mutateDocuments,
  } = useSWR<Array<Document>>(
    block && block.status !== 'streaming'
      ? `/api/document?id=${block.documentId}`
      : null,
    fetcher,
  );

  const { data: suggestions } = useSWR<Array<Suggestion>>(
    documents && block && block.status !== 'streaming'
      ? `/api/suggestions?documentId=${block.documentId}`
      : null,
    fetcher,
    {
      dedupingInterval: 5000,
    },
  );

  const [mode, setMode] = useState<'edit' | 'diff' | 'latex'>('edit');
  const [document, setDocument] = useState<Document | null>(null);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [pdfState, setPdfState] = useState<PDFState>({
    loading: false,
    error: null,
    pdfUrl: null,
    compilationLog: null,
    pageNumber: 1,
    numPages: null
  });

  // Effect to detect LaTeX content in messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        const latexContent = detectLatexContent(lastMessage.content);
        if (latexContent) {
          setBlock((currentBlock) => ({
            ...currentBlock,
            content: latexContent,
            isLatex: true,
          }));
          setMode('latex');          // Switch to editor tab when streaming starts
          setActiveTab('editor');
          // Reset PDF state to loading
          setPdfState(prev => ({
            ...prev,
            loading: true,
            error: null,
            pdfUrl: null
          }));
        }
      }
    }
  }, [messages, setBlock]);

  useEffect(() => {
    if (documents && documents.length > 0) {
      const mostRecentDocument = documents.at(-1);

      if (mostRecentDocument) {
        setDocument(mostRecentDocument);
        setCurrentVersionIndex(documents.length - 1);
        setBlock((currentBlock) => ({
          ...currentBlock,
          content: mostRecentDocument.content ?? '',
        }));
      }
    }
  }, [documents, setBlock]);

  useEffect(() => {
    mutateDocuments();
  }, [block.status, mutateDocuments]);

  const { mutate } = useSWRConfig();
  const [isContentDirty, setIsContentDirty] = useState(false);

  const handleContentChange = useCallback(
    (updatedContent: string) => {
      if (!block) return;

      mutate<Array<Document>>(
        `/api/document?id=${block.documentId}`,
        async (currentDocuments) => {
          if (!currentDocuments) return undefined;

          const currentDocument = currentDocuments.at(-1);

          if (!currentDocument || !currentDocument.content) {
            setIsContentDirty(false);
            return currentDocuments;
          }

          if (currentDocument.content !== updatedContent) {
            await fetch(`/api/document?id=${block.documentId}`, {
              method: 'POST',
              body: JSON.stringify({
                title: block.title,
                content: updatedContent,
              }),
            });

            setIsContentDirty(false);

            const newDocument = {
              ...currentDocument,
              content: updatedContent,
              createdAt: new Date(),
            };

            return [...currentDocuments, newDocument];
          }
          return currentDocuments;
        },
        { revalidate: false },
      );
    },
    [block, mutate],
  );

  const debouncedHandleContentChange = useDebounceCallback(
    handleContentChange,
    2000,
  );

  const saveContent = useCallback(
    (updatedContent: string, debounce: boolean) => {
      if (document && updatedContent !== document.content) {
        setIsContentDirty(true);

        if (debounce) {
          debouncedHandleContentChange(updatedContent);
        } else {
          handleContentChange(updatedContent);
        }
      }
    },
    [document, debouncedHandleContentChange, handleContentChange],
  );

  function getDocumentContentById(index: number) {
    if (!documents) return '';
    if (!documents[index]) return '';
    return documents[index].content ?? '';
  }

  const handleVersionChange = (type: 'next' | 'prev' | 'toggle' | 'latest') => {
    if (!documents) return;

    if (type === 'latest') {
      setCurrentVersionIndex(documents.length - 1);
      setMode('edit');
    }

    if (type === 'toggle') {
      if (block.isLatex) {
        setMode((mode) => (mode === 'latex' ? 'edit' : 'latex'));
      } else {
        setMode((mode) => (mode === 'edit' ? 'diff' : 'edit'));
      }
    }

    if (type === 'prev') {
      if (currentVersionIndex > 0) {
        setCurrentVersionIndex((index) => index - 1);
      }
    } else if (type === 'next') {
      if (currentVersionIndex < documents.length - 1) {
        setCurrentVersionIndex((index) => index + 1);
      }
    }
  };

  const [isToolbarVisible, setIsToolbarVisible] = useState(false);

  /*
   * NOTE: if there are no documents, or if
   * the documents are being fetched, then
   * we mark it as the current version.
   */

  const isCurrentVersion =
    documents && documents.length > 0
      ? currentVersionIndex === documents.length - 1
      : true;

  const { width: windowWidth, height: windowHeight } = useWindowSize();
  const isMobile = windowWidth ? windowWidth < 768 : false;

  const [_, copyToClipboard] = useCopyToClipboard();

  // Function to compile LaTeX and update PDF state
  const compileLaTeX = useCallback(async (latexContent: string) => {
    setPdfState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      const response = await fetch('/api/compile-latex', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latexSource: latexContent })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'PDF compilation failed');
      }

      // Create blob URL from the PDF buffer
      const pdfBlob = await response.blob();
      const pdfUrl = URL.createObjectURL(pdfBlob);

      setPdfState(prev => ({
        ...prev,
        loading: false,
        error: null,
        pdfUrl,
        compilationLog: null
      }));
    } catch (error: any) {
      setPdfState(prev => ({
        ...prev,
        loading: false,
        error: error.message,
        pdfUrl: null,
        compilationLog: error.log || null
      }));
    }
  }, []);

  // Effect to compile LaTeX when streaming is complete
  useEffect(() => {
    if (!isLoading && block.isLatex && block.content) {
      compileLaTeX(block.content);
    }
  }, [isLoading, block.isLatex, block.content, compileLaTeX]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (pdfState.pdfUrl) {
        URL.revokeObjectURL(pdfState.pdfUrl);
      }
    };
  }, [pdfState.pdfUrl]);

  return (
    <motion.div className="flex flex-row h-dvh w-dvw fixed top-0 left-0 z-50 bg-background">
      {!isMobile && (
        <motion.div
          className="relative w-[40%] bg-muted dark:bg-background h-dvh shrink-0 border-r"
          initial={{ opacity: 0, x: 10, scale: 1 }}
          animate={{
            opacity: 1,
            x: 0,
            scale: 1,
            transition: {
              delay: 0.2,
              type: 'spring',
              stiffness: 200,
              damping: 30,
            },
          }}
          exit={{
            opacity: 0,
            x: 0,
            scale: 0.95,
            transition: { delay: 0 },
          }}
        >
          <AnimatePresence>
            {!isCurrentVersion && (
              <motion.div
                className="left-0 absolute h-dvh w-[400px] top-0 bg-zinc-900/50 z-50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              />
            )}
          </AnimatePresence>

          <div className="flex flex-col h-full justify-between items-stretch gap-4">
            <div
              ref={messagesContainerRef}
              className="flex flex-col gap-4 h-full overflow-y-scroll px-4 pt-20"
            >
              {messages.map((message, index) => (
                <PreviewMessage
                  chatId={chatId}
                  key={message.id}
                  message={message}
                  block={block}
                  setBlock={setBlock}
                  isLoading={isLoading && index === messages.length - 1}
                  vote={
                    votes
                      ? votes.find((vote) => vote.messageId === message.id)
                      : undefined
                  }
                />
              ))}

              <div
                ref={messagesEndRef}
                className="shrink-0 min-w-[24px] min-h-[24px]"
              />
            </div>

            <div className="sticky bottom-0 w-full px-4 pb-4 bg-muted dark:bg-background">
              <form className="flex flex-row gap-2 relative items-end w-full">
                <MultimodalInput
                  chatId={chatId}
                  input={input}
                  setInput={setInput}
                  handleSubmit={handleSubmit}
                  isLoading={isLoading}
                  stop={stop}
                  attachments={attachments}
                  setAttachments={setAttachments}
                  messages={messages}
                  append={append}
                  className="bg-background dark:bg-muted"
                  setMessages={setMessages}
                />
              </form>
            </div>
          </div>
        </motion.div>
      )}

      <motion.div
        className="fixed dark:bg-background bg-background h-dvh flex flex-col shadow-xl overflow-hidden"
        style={{
          left: isMobile ? 0 : '40%',
          width: isMobile ? '100%' : '60%',
        }}
        initial={
          isMobile
            ? {
                opacity: 0,
                x: 0,
                y: 0,
                width: windowWidth,
                height: windowHeight,
                borderRadius: 50,
              }
            : {
                opacity: 0,
                x: block.boundingBox.left,
                y: block.boundingBox.top,
                height: block.boundingBox.height,
                width: block.boundingBox.width,
                borderRadius: 50,
              }
        }
        animate={
          isMobile
            ? {
                opacity: 1,
                x: 0,
                y: 0,
                width: windowWidth,
                height: '100dvh',
                borderRadius: 0,
                transition: {
                  delay: 0,
                  type: 'spring',
                  stiffness: 200,
                  damping: 30,
                },
              }
            : {
                opacity: 1,
                x: 0,
                y: 0,
                height: windowHeight,
                width: '60%',
                borderRadius: 0,
                transition: {
                  delay: 0,
                  type: 'spring',
                  stiffness: 200,
                  damping: 30,
                },
              }
        }
        exit={{
          opacity: 0,
          scale: 0.5,
          transition: {
            delay: 0.1,
            type: 'spring',
            stiffness: 600,
            damping: 30,
          },
        }}
      >
        <Tabs defaultValue="editor" className="flex-1 flex flex-col">
          <div className="border-b px-4 h-12 flex items-center justify-between">
            <TabsList className="border-0 bg-transparent h-full">
              <TabsTrigger 
                value="editor" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
              >
                <CodeIcon size={16} />
                LaTeX
              </TabsTrigger>
              <TabsTrigger 
                value="preview"
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none flex items-center gap-2"
              >
                <FileIcon size={16} />
                Preview
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="default"
                className="h-8"
              >
                Export
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  copyToClipboard(block.content);
                  toast.success('Copied to clipboard!');
                }}
              >
                <CopyIcon size={16} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => {
                  setBlock((currentBlock) => ({
                    ...currentBlock,
                    isVisible: false,
                  }));
                }}
              >
                <CrossIcon size={16} />
              </Button>
            </div>
          </div>

          <TabsContent value="editor" className="flex-1 m-0 p-0 data-[state=active]:flex">
            <div className="w-full h-full bg-white">
              {isDocumentsFetching && !block.content ? (
                <DocumentSkeleton />
              ) : mode === 'latex' && block.isLatex ? (
                <div className="w-full h-full">
                  <LatexEditor
                    content={block.content}
                    onChange={(newContent) => saveContent(newContent, true)}
                    readOnly={!isCurrentVersion}
                  />
                </div>
              ) : mode === 'edit' ? (
                block.isLatex ? (
                  <div className="w-full flex flex-col">
                    <Editor
                      content={`\`\`\`latex\n${isCurrentVersion ? block.content : getDocumentContentById(currentVersionIndex)}\n\`\`\``}
                      isCurrentVersion={isCurrentVersion}
                      currentVersionIndex={currentVersionIndex}
                      status={block.status}
                      saveContent={(content) => {
                        const latexContent = detectLatexContent(content);
                        if (latexContent) {
                          saveContent(latexContent, true);
                        }
                      }}
                      suggestions={isCurrentVersion ? (suggestions ?? []) : []}
                    />
                  </div>
                ) : (
                  <Editor
                    content={
                      isCurrentVersion
                        ? block.content
                        : getDocumentContentById(currentVersionIndex)
                    }
                    isCurrentVersion={isCurrentVersion}
                    currentVersionIndex={currentVersionIndex}
                    status={block.status}
                    saveContent={saveContent}
                    suggestions={isCurrentVersion ? (suggestions ?? []) : []}
                  />
                )
              ) : (
                <DiffView
                  oldContent={getDocumentContentById(currentVersionIndex - 1)}
                  newContent={getDocumentContentById(currentVersionIndex)}
                />
              )}
            </div>
          </TabsContent>
          <TabsContent value="preview" className="flex-1 m-0 p-0 data-[state=active]:flex">
            <ResumePreview
              latexContent={block.content}
              pdfState={pdfState}
              setPdfState={setPdfState}
            />
          </TabsContent>
        </Tabs>

        <AnimatePresence>
          {!isCurrentVersion && (
            <VersionFooter
              block={block}
              currentVersionIndex={currentVersionIndex}
              documents={documents}
              handleVersionChange={handleVersionChange}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
