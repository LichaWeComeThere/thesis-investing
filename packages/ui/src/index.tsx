import type { PropsWithChildren } from 'react';

export type CardProps = PropsWithChildren<{
  title?: string;
}>;

const cardStyle = {
  background: '#ffffff',
  border: '1px solid #d8ddd8',
  borderRadius: 8,
  boxShadow: '0 18px 40px rgba(31, 41, 51, 0.08)',
  padding: 32
};

export function Card({ children, title }: CardProps): JSX.Element {
  return (
    <section style={cardStyle}>
      {title ? <h1>{title}</h1> : null}
      {children}
    </section>
  );
}
