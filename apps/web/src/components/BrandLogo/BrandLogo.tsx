import logo from '@/assets/logo.png';
import styles from './BrandLogo.module.css';

type BrandLogoProps = {
  className?: string;
};

/** Identidade visual compartilhada do Diagram.AI. */
export function BrandLogo({ className }: BrandLogoProps) {
  return <img alt='' className={`${styles.logo} ${className ?? ''}`} src={logo} />;
}
