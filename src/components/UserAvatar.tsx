import React from 'react';

interface UserAvatarProps {
  name?: string;
  avatar?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  shape?: 'circle' | 'rounded' | 'square';
  className?: string;
  showBadge?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  name = 'User',
  avatar,
  size = 'md',
  shape = 'circle',
  className = '',
  showBadge = false,
}) => {
  const sizeClasses = {
    xs: 'w-5 h-5 text-[9px]',
    sm: 'w-7 h-7 text-[11px]',
    md: 'w-8 h-8 text-xs',
    lg: 'w-11 h-11 text-sm font-semibold',
    xl: 'w-16 h-16 text-lg font-bold',
    '2xl': 'w-24 h-24 text-2xl font-bold',
    full: 'w-full h-full text-2xl font-bold',
  };

  const shapeClasses = {
    circle: 'rounded-full',
    rounded: 'rounded-2xl',
    square: 'rounded-lg',
  };

  const isImageUrl = (str?: string | null): boolean => {
    if (!str) return false;
    return (
      str.startsWith('data:image/') ||
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('/') ||
      str.startsWith('blob:')
    );
  };

  const getInitials = (n: string): string => {
    if (!n) return 'U';
    const parts = n.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const isImage = isImageUrl(avatar);
  const initials = avatar && !isImage && avatar.length <= 4 ? avatar : getInitials(name);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 select-none ${className}`}>
      <div
        className={`${size === 'full' ? 'w-full h-full' : sizeClasses[size]} ${shapeClasses[shape]} overflow-hidden flex items-center justify-center bg-gradient-to-tr from-blue-700 to-indigo-900 text-white font-medium shadow-xs border border-slate-200/80`}
      >
        {isImage && avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-cover block"
            onError={(e) => {
              // fallback if broken image
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
        ) : (
          <span className="tracking-tight">{initials}</span>
        )}
      </div>
      {showBadge && (
        <span
          className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white"
          title="Online"
        />
      )}
    </div>
  );
};
