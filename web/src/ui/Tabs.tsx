import * as RadixTabs from '@radix-ui/react-tabs'
import type { ComponentProps } from 'react'
import { cn } from '../lib/cn'

/** Pill tabs (Radix). Usage: <Tabs value onValueChange><TabList><Tab value>..</Tab></TabList><TabPanel value>..</TabPanel></Tabs> */
export const Tabs = RadixTabs.Root
export const TabList = ({ className, ...p }: ComponentProps<typeof RadixTabs.List>) =>
  <RadixTabs.List {...p} className={cn('tabs-list', className)} />
export const Tab = ({ className, ...p }: ComponentProps<typeof RadixTabs.Trigger>) =>
  <RadixTabs.Trigger {...p} className={cn('tabs-trigger', className)} />
export const TabPanel = RadixTabs.Content
