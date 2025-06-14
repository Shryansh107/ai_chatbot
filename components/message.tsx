'use client';

import type { Message } from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect } from 'react';

import type { Vote } from '@/lib/db/schema';

import type { UIBlock } from './block';
import { DocumentToolCall, DocumentToolResult } from './document';
import { SparklesIcon, MessageIcon } from './icons';
import { Markdown } from './markdown';
import { MessageActions } from './message-actions';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import LatexEditor from './latex-editor';

// Function to detect LaTeX content in messages
function detectLatexContent(text: string): string | null {
  const latexMatch = text.match(/```latex\n([\s\S]*?)(?:\n```|$)/);
  return latexMatch ? latexMatch[1] : null;
}

export const PreviewMessage = ({
  chatId,
  message,
  block,
  setBlock,
  vote,
  isLoading,
}: {
  chatId: string;
  message: Message;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  vote: Vote | undefined;
  isLoading: boolean;
}) => {
  const latexContent = message.role === 'assistant' ? detectLatexContent(message.content as string) : null;
  const messageContent = message.role === 'assistant' && latexContent 
    ? (message.content as string).replace(/```latex\n([\s\S]*?)(?:\n```|$)/, '') 
    : message.content;

  // Auto-open artifact when LaTeX content is first detected during streaming
  useEffect(() => {
    if (isLoading && latexContent && !block.isVisible) {
      setBlock((currentBlock) => ({
        ...currentBlock,
        content: latexContent,
        isLatex: true,
        isVisible: true,
        title: 'LaTeX Editor',
      }));
    }
  }, [isLoading, latexContent, block.isVisible, setBlock]);

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div
        className={cx(
          'group-data-[role=user]/message:bg-primary group-data-[role=user]/message:text-primary-foreground flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
        )}
      >
        {message.role === 'assistant' && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          {messageContent && (
            <div className="flex flex-col gap-4">
              <Markdown>{messageContent as string}</Markdown>
            </div>
          )}

          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="flex flex-col gap-4">
              {message.toolInvocations.map((toolInvocation) => {
                const { toolName, toolCallId, state, args } = toolInvocation;

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentToolResult
                          type="create"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={toolCallId}
                    className={cx({
                      skeleton: ['getWeather'].includes(toolName),
                    })}
                  >
                    {toolName === 'getWeather' ? (
                      <Weather />
                    ) : toolName === 'createDocument' ? (
                      <DocumentToolCall type="create" args={args} />
                    ) : toolName === 'updateDocument' ? (
                      <DocumentToolCall type="update" args={args} />
                    ) : toolName === 'requestSuggestions' ? (
                      <DocumentToolCall
                        type="request-suggestions"
                        args={args}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {message.experimental_attachments && (
            <div className="flex flex-row gap-2">
              {message.experimental_attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between">
            <MessageActions
              key={`action-${message.id}`}
              chatId={chatId}
              message={message}
              vote={vote}
              isLoading={isLoading}
            />
            {latexContent && !isLoading && (
              <Button
                variant="outline"
                className="py-1 px-2 h-fit text-muted-foreground flex items-center gap-2"
                onClick={() => {
                  setBlock((currentBlock) => ({
                    ...currentBlock,
                    content: latexContent,
                    isLatex: true,
                    isVisible: true,
                    title: 'LaTeX Editor',
                  }));
                }}
                disabled={block.isVisible}
              >
                <MessageIcon size={16} />
                <span className="text-sm">Open in LaTeX Editor</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
