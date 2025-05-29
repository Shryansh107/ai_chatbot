'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { BetterTooltip } from '@/components/ui/tooltip';
import { PlusIcon, VercelIcon } from './icons';
import { useSidebar } from './ui/sidebar';

export function ChatHeader({ selectedModelId }: { selectedModelId: string }) {
  const router = useRouter();
  const { open } = useSidebar();
  const [mounted, setMounted] = useState(false);
  const { width: windowWidth } = useWindowSize();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <header className="flex sticky top-0 bg-background border-b py-2 items-center px-4 gap-2">
        <SidebarToggle />
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold">rsume.fyi</h1>
        </div>
      </header>
    );
  }

  return (
    <header className="flex sticky top-0 bg-background border-b py-2 items-center px-4 gap-2">
      <SidebarToggle />
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold">rsume.fyi</h1>
      </div>
      {(!open || windowWidth < 768) && (
        <BetterTooltip content="New Chat">
          <Button
            variant="outline"
            className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
            onClick={() => {
              router.push('/');
              router.refresh();
            }}
          >
            <PlusIcon />
            <span className="md:sr-only">New Chat</span>
          </Button>
        </BetterTooltip>
      )}
      <div className="ml-auto flex items-center gap-2">
        <div className="bg-black text-white rounded-full px-4 py-1 text-sm flex items-center gap-1">
          <span>ATS Score:</span>
          <span className="font-semibold">85%</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
        >
          <span className="sr-only">User menu</span>
          <div className="w-6 h-6 rounded-full bg-zinc-300 flex items-center justify-center text-xs text-zinc-600">
            S
          </div>
        </Button>
      </div>
    </header>
  );
}
