import { createFileRoute } from '@tanstack/react-router'
import { ColapsoPage } from '@/pages';

export const Route = createFileRoute('/_authenticated/colapso')({
  component: ColapsoPage,
})
