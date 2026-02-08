import { useLanguage } from '@/hooks/useLanguage';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  showLabel?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  variant = 'ghost',
  size = 'sm',
  showLabel = false,
  className
}: LanguageSwitcherProps) {
  const { language, setLanguage, supportedLanguages } = useLanguage();

  const currentLanguage = supportedLanguages.find(l => l.code === language) || supportedLanguages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn('gap-2', className)}
        >
          <span className="text-base">{currentLanguage.flag}</span>
          {showLabel && (
            <span className="hidden sm:inline">{currentLanguage.name}</span>
          )}
          {!showLabel && size !== 'icon' && (
            <Globe className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              'gap-2 cursor-pointer',
              language === lang.code && 'bg-accent'
            )}
          >
            <span className="text-base">{lang.flag}</span>
            <span>{lang.name}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
