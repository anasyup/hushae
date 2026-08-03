/* ============================================================================
 * Curated icon registry.
 *
 * The editor needs to resolve icons by name at runtime (schemas store strings).
 * A namespace import (`import * as Icons`) would defeat tree-shaking and pull
 * the entire lucide set — ~760 kB — into the bundle. Naming the icons we
 * actually use keeps the payload to what ships on screen.
 * ========================================================================== */

import {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  Award, BadgePercent, Banknote, Braces, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CircleHelp, Clock, Code, Columns2, Copy, CreditCard, Droplets, Eye,
  EyeOff, Facebook, GalleryHorizontal, Gift, GitCommitHorizontal, Grid3x3, Group,
  Headphones, Heading, Heart, History, Image as ImageIcon, Images, Info, Instagram,
  Layers, Layout, LayoutGrid, Leaf, Library, Link, List, Loader2, Lock, Mail, MapPin,
  Megaphone, MessageSquare, Minus, Monitor, MoreHorizontal, MousePointerClick,
  MoveVertical, Music2, Newspaper, Package, PackageCheck, PackageSearch, Palette,
  PanelBottom, PanelTop, PanelTopOpen, Pencil, Phone, Plus, Quote, Recycle, RefreshCw,
  RotateCcw, Rows3, Ruler, Search, Send, Settings2, ShieldCheck, ShoppingBag,
  Smartphone, Sparkles, Square, Star, Store, Tablet, Tag, TextCursorInput, ThumbsUp,
  Timer, Truck, Type, Undo2, Redo2, User, Video, Wand2, Wind, X, Zap, Save, Cloud,
  Check, Snowflake, Trash2, GripVertical,
} from 'lucide-react';

import type { ComponentType } from 'react';

export interface IconProps {
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
  strokeWidth?: number;
  fill?: string;
}

export const ICONS: Record<string, ComponentType<IconProps>> = {
  AlignCenter, AlignLeft, AlignRight, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  Award, BadgePercent, Banknote, Braces, ChevronDown, ChevronLeft, ChevronRight,
  ChevronUp, CircleHelp, Clock, Code, Columns2, Copy, CreditCard, Droplets, Eye,
  EyeOff, Facebook, GalleryHorizontal, Gift, GitCommitHorizontal, Grid3x3, Group,
  Headphones, Heading, Heart, History, Image: ImageIcon, ImageIcon, Images, Info,
  Instagram, Layers, Layout, LayoutGrid, Leaf, Library, Link, List, Loader2, Lock,
  Mail, MapPin, Megaphone, MessageSquare, Minus, Monitor, MoreHorizontal,
  MousePointerClick, MoveVertical, Music2, Newspaper, Package, PackageCheck,
  PackageSearch, Palette, PanelBottom, PanelTop, PanelTopOpen, Pencil, Phone, Plus,
  Quote, Recycle, RefreshCw, RotateCcw, Rows3, Ruler, Search, Send, Settings2,
  ShieldCheck, ShoppingBag, Smartphone, Sparkles, Square, Star, Store, Tablet, Tag,
  TextCursorInput, ThumbsUp, Timer, Truck, Type, Undo2, Redo2, User, Video, Wand2,
  Wind, X, Zap, Save, Cloud, Check, Snowflake, Trash2, GripVertical,
};

/** Icons offered in the icon_picker field. */
export const PICKER_ICONS = [
  'Star', 'Heart', 'Truck', 'PackageCheck', 'RefreshCw', 'ShieldCheck', 'Banknote',
  'CreditCard', 'MapPin', 'Phone', 'Mail', 'Clock', 'Gift', 'Tag', 'Sparkles', 'Wind',
  'Droplets', 'Snowflake', 'Layers', 'Ruler', 'Award', 'ThumbsUp', 'Leaf', 'Recycle',
  'Lock', 'Headphones', 'Send', 'Zap',
];

export function resolveIcon(name?: string): ComponentType<IconProps> {
  return (name && ICONS[name]) || Square;
}
