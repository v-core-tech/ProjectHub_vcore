import { Check, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Badge } from './badge'
import { Button } from './button'
import { Input } from './input'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export type ComboboxMultipleOption = {
	value: string
	label: string
}

type ComboboxMultipleProps = {
	value: string[]
	options: ComboboxMultipleOption[]
	onChange: (value: string[]) => void
	placeholder?: string
	searchPlaceholder?: string
	emptyLabel?: string
}

export function ComboboxMultiple({
	value,
	options,
	onChange,
	placeholder = 'Select options',
	searchPlaceholder = 'Search...',
	emptyLabel = 'No values',
}: ComboboxMultipleProps) {
	const [open, setOpen] = React.useState(false)
	const [query, setQuery] = React.useState('')

	const filtered = React.useMemo(
		() =>
			options.filter(option =>
				option.label.toLowerCase().includes(query.toLowerCase()),
			),
		[options, query],
	)

	const selected = options.filter(option => value.includes(option.value))

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					aria-expanded={open}
					className='w-full justify-between'
				>
					<span className='truncate'>
						{selected.length
							? selected.map(item => item.label).join(', ')
							: placeholder}
					</span>
					<ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[var(--radix-popover-trigger-width)] p-2'>
				<Input
					value={query}
					onChange={event => setQuery(event.target.value)}
					placeholder={searchPlaceholder}
				/>

				{selected.length > 0 && (
					<div className='mt-2 flex flex-wrap gap-1'>
						{selected.map(item => (
							<Badge key={item.value} variant='outline'>
								{item.label}
							</Badge>
						))}
					</div>
				)}

				<div className='mt-2 max-h-64 overflow-y-auto'>
					{filtered.map(option => {
						const checked = value.includes(option.value)
						return (
							<button
								key={option.value}
								className='flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm hover:bg-muted'
								onClick={() => {
									if (checked) {
										onChange(value.filter(item => item !== option.value))
									} else {
										onChange([...value, option.value])
									}
								}}
							>
								<span>{option.label}</span>
								<Check
									className={cn(
										'h-4 w-4',
										checked ? 'opacity-100' : 'opacity-0',
									)}
								/>
							</button>
						)
					})}
					{filtered.length === 0 && (
						<p className='px-2 py-2 text-sm text-muted-foreground'>
							{emptyLabel}
						</p>
					)}
				</div>
			</PopoverContent>
		</Popover>
	)
}
