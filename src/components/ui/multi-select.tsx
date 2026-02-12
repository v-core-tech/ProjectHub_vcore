import { ChevronDown } from 'lucide-react'
import { Button } from './button'
import { Checkbox } from './checkbox'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

type MultiSelectOption = {
	value: string
	label: string
}

type MultiSelectProps = {
	options: MultiSelectOption[]
	value: string[]
	onChange: (value: string[]) => void
	placeholder?: string
}

function MultiSelect({
	options,
	value,
	onChange,
	placeholder = 'Выберите',
}: MultiSelectProps) {
	const label = value.length
		? options
				.filter(option => value.includes(option.value))
				.map(option => option.label)
				.join(', ')
		: placeholder

	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant='outline'
					role='combobox'
					className='w-full justify-between font-normal'
				>
					<span className='truncate text-left'>{label}</span>
					<ChevronDown className='ml-2 h-4 w-4 shrink-0 opacity-60' />
				</Button>
			</PopoverTrigger>
			<PopoverContent className='w-[var(--radix-popover-trigger-width)] p-2'>
				<div className='max-h-64 space-y-1 overflow-auto'>
					{options.length === 0 && (
						<p className='p-2 text-sm text-muted-foreground'>Нет значений</p>
					)}
					{options.map(option => {
						const checked = value.includes(option.value)
						return (
							<label
								key={option.value}
								className='flex cursor-pointer items-center gap-2 rounded-xl p-2 text-sm hover:bg-muted'
							>
								<Checkbox
									checked={checked}
									onCheckedChange={(next: boolean | 'indeterminate') => {
										if (next === true) {
											onChange([...value, option.value])
										} else {
											onChange(value.filter(item => item !== option.value))
										}
									}}
								/>
								<span>{option.label}</span>
							</label>
						)
					})}
				</div>
			</PopoverContent>
		</Popover>
	)
}

export { MultiSelect }
export type { MultiSelectOption }
