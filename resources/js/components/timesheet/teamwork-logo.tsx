import type { ImgHTMLAttributes } from 'react';
import mark from '@/assets/teamwork-mark.png';
import pill from '@/assets/teamwork.png';
import { cn } from '@/lib/utils';

const sources = {
    mark,
    pill,
} as const;

export function TeamworkLogo({
    variant = 'pill',
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
