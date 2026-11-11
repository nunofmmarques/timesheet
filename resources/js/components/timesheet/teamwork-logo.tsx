import type { ImgHTMLAttributes } from 'react';
import slate from '@/assets/tw-slate.png';
import transparent from '@/assets/tw-transparent.png';
import white from '@/assets/tw-white.png';
import { cn } from '@/lib/utils';

const sources = {
    slate,
    transparent,
    white,
} as const;

export function TeamworkLogo({
    variant = 'white',
    className,
    alt = '',
    ...props
}: ImgHTMLAttributes<HTMLImageElement> & {
    variant?: keyof typeof sources;
}) {
    return (
        <img
            src={sources[variant]}
            alt={alt}
            className={cn('size-4 shrink-0', className)}
            {...props}
        />
    );
}
