import {
  Home,
  UtensilsCrossed,
  Car,
  HeartPulse,
  GraduationCap,
  Gamepad2,
  Wrench,
  MoreHorizontal,
  CreditCard,
  Wifi,
  ShoppingBag,
  Dumbbell,
  Baby,
  Dog,
  Plane,
  Gift,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  'Moradia': Home,
  'Alimentação': UtensilsCrossed,
  'Transporte': Car,
  'Saúde': HeartPulse,
  'Educação': GraduationCap,
  'Lazer': Gamepad2,
  'Serviços': Wrench,
  'Outros': MoreHorizontal,
  'Cartão': CreditCard,
  'Internet': Wifi,
  'Compras': ShoppingBag,
  'Academia': Dumbbell,
  'Filhos': Baby,
  'Pet': Dog,
  'Viagem': Plane,
  'Presentes': Gift,
};

export function getCategoryIcon(categoryName: string): LucideIcon {
  return CATEGORY_ICON_MAP[categoryName] || MoreHorizontal;
}

// Category color map based on the default categories
const CATEGORY_COLOR_MAP: Record<string, string> = {
  'Moradia': 'hsl(217, 91%, 60%)',
  'Alimentação': 'hsl(38, 92%, 50%)',
  'Transporte': 'hsl(280, 65%, 60%)',
  'Saúde': 'hsl(0, 72%, 51%)',
  'Educação': 'hsl(160, 84%, 39%)',
  'Lazer': 'hsl(330, 80%, 60%)',
  'Serviços': 'hsl(200, 70%, 50%)',
  'Outros': 'hsl(215, 20%, 55%)',
};

export function getCategoryColor(categoryName: string): string {
  return CATEGORY_COLOR_MAP[categoryName] || 'hsl(215, 20%, 55%)';
}
