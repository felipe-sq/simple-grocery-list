import { ShoppingCart } from 'lucide-react';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="bg-primary text-primary-foreground flex size-14 items-center justify-center rounded-2xl">
            <ShoppingCart className="size-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Simple Grocery List</h1>
        </div>
        {children}
      </div>
    </div>
  );
}
