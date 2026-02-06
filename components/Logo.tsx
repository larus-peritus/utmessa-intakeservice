import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large' | 'xlarge';
  className?: string;
}

const sizeMap = {
  small: 'w-32 h-32',
  medium: 'w-56 h-56 sm:w-64 sm:h-64',
  large: 'w-56 h-56 sm:w-64 sm:h-64 lg:w-96 lg:h-96',
  xlarge: 'w-56 h-56 sm:w-64 sm:h-64 lg:w-[480px] lg:h-[480px]',
};

export default function Logo({ size = 'medium', className = '' }: LogoProps) {
  return (
    <div className={`relative ${sizeMap[size]} ${className}`}>
      <Image
        src="/logo.png"
        alt="Peritus merki"
        fill
        className="object-contain drop-shadow-lg"
        priority
      />
    </div>
  );
}
