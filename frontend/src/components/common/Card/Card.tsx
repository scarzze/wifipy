import React from 'react';
import { clsx } from 'clsx';
import styles from './Card.module.scss';

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'small' | 'medium' | 'large';
  shadow?: 'none' | 'small' | 'medium' | 'large';
}

export default function Card({ 
  children, 
  className, 
  padding = 'medium',
  shadow = 'medium'
}: CardProps) {
  return (
    <div className={clsx(
      styles.card,
      styles[`padding-${padding}`],
      styles[`shadow-${shadow}`],
      className
    )}>
      {children}
    </div>
  );
}