import { createFileRoute } from '@tanstack/react-router'
//import { ColapsoPage } from '@/pages';
import { ColapsoV2Page } from '@/pages';

export const Route = createFileRoute('/_authenticated/colapso')({
  component: ColapsoV2Page,
})
