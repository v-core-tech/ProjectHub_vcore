import { GripVertical, Pencil, Trash2 } from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Combobox } from './components/ui/combobox'
import { ComboboxMultiple } from './components/ui/combobox-multiple'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './components/ui/dialog'
import { Input } from './components/ui/input'
import { Textarea } from './components/ui/textarea'
import {
	AppState,
	IncomeExpenseItem,
	LinkItem,
	Project,
	Tag,
	loadState,
	saveState,
} from './lib/db'
import { Locale, t } from './lib/i18n'
import { cn, downloadCsv, extractDomain, formatAmount } from './lib/utils'

const DEFAULT_FAVICON =
	"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='64' height='64' rx='16' fill='%23e5e2dc'/><path d='M18 20h28v24H18z' fill='%231c1b1a'/><path d='M22 24h20v4H22zM22 30h20v4H22zM22 36h14v4H22z' fill='%23f5f4f0'/></svg>"

type ConfirmState = {
	title: string
	description: string
	onConfirm: () => void
}

type LinkPayload = {
	title: string
	description: string
	url: string
	tags: string[]
}

function generateId(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}`
}

function createDemoState(): AppState {
	const tags: Tag[] = [
		{ id: generateId('tag'), name: 'backend' },
		{ id: generateId('tag'), name: 'frontend' },
		{ id: generateId('tag'), name: 'design' },
		{ id: generateId('tag'), name: 'infra' },
		{ id: generateId('tag'), name: 'management' },
		{ id: generateId('tag'), name: 'analytics' },
	]
	const projectId = generateId('project')
	const project: Project = {
		id: projectId,
		title: 'Loyalty Platform Web App',
		shortDescription:
			'Production web app for customer loyalty management: catalog, rewards, admin panel, and analytics.',
		monthlyOperatingCosts: [
			{
				id: generateId('cost'),
				amount: -1200,
				comment: 'Vercel Pro + edge functions',
			},
			{
				id: generateId('cost'),
				amount: -450,
				comment: 'Atlassian (Jira + Confluence)',
			},
			{
				id: generateId('cost'),
				amount: -250,
				comment: 'Sentry + log retention',
			},
			{
				id: generateId('cost'),
				amount: -320,
				comment: 'DesignOps tools (Figma/Framer)',
			},
		],
		monthlyIncome: [
			{
				id: generateId('income'),
				amount: 6200,
				comment: 'B2B subscription plans',
			},
			{
				id: generateId('income'),
				amount: 1800,
				comment: 'Enterprise support add-on',
			},
		],
		orderIndex: 0,
	}
	const links: LinkItem[] = [
		{
			id: generateId('link'),
			projectId,
			title: 'GitHub Monorepo',
			description:
				'Main repository with web app, API gateway, and shared packages',
			url: 'https://github.com/vercel/next.js',
			tags: [tags[0].id, tags[1].id],
			domain: 'github.com',
			iconCache: faviconProxy('https://github.com'),
		},
		{
			id: generateId('link'),
			projectId,
			title: 'Staging Environment',
			description: 'Pre-production deployment for QA and acceptance testing',
			url: 'https://vercel.com',
			tags: [tags[3].id],
			domain: 'vercel.com',
			iconCache: faviconProxy('https://vercel.com'),
		},
		{
			id: generateId('link'),
			projectId,
			title: 'Jira Roadmap',
			description: 'Sprint board, backlog, delivery milestones, and incidents',
			url: 'https://www.atlassian.com/software/jira',
			tags: [tags[4].id],
			domain: 'atlassian.com',
			iconCache: faviconProxy('https://www.atlassian.com/software/jira'),
		},
		{
			id: generateId('link'),
			projectId,
			title: 'Figma System',
			description: 'UI kit, component states, and handoff specs for frontend',
			url: 'https://www.figma.com',
			tags: [tags[2].id, tags[1].id],
			domain: 'figma.com',
			iconCache: faviconProxy('https://www.figma.com'),
		},
		{
			id: generateId('link'),
			projectId,
			title: 'Sentry Dashboard',
			description: 'Runtime errors, alerts, and release health tracking',
			url: 'https://sentry.io',
			tags: [tags[3].id],
			domain: 'sentry.io',
			iconCache: faviconProxy('https://sentry.io'),
		},
		{
			id: generateId('link'),
			projectId,
			title: 'Product Analytics',
			description: 'Funnels and retention reports for conversion optimization',
			url: 'https://mixpanel.com',
			tags: [tags[5].id],
			domain: 'mixpanel.com',
			iconCache: faviconProxy('https://mixpanel.com'),
		},
	]

	return {
		locale: 'en',
		projects: [project],
		links,
		tags,
		selectedProjectId: projectId,
		faviconCache: {},
	}
}

function sumItems(items: IncomeExpenseItem[]) {
	return items.reduce((acc, item) => acc + item.amount, 0)
}

function faviconProxy(url: string) {
	return `https://www.google.com/s2/favicons?sz=64&domain_url=${encodeURIComponent(url)}`
}

function normalizeImportedState(raw: unknown): AppState | null {
	if (!raw || typeof raw !== 'object') return null
	const candidate = raw as Partial<AppState>
	if (!Array.isArray(candidate.projects)) return null
	if (!Array.isArray(candidate.links)) return null
	if (!Array.isArray(candidate.tags)) return null

	const projects: Project[] = candidate.projects.map((project, index) => ({
		id: project.id || generateId('project'),
		title: project.title || 'Untitled',
		shortDescription: project.shortDescription || '',
		monthlyOperatingCosts: Array.isArray(project.monthlyOperatingCosts)
			? project.monthlyOperatingCosts.map(item => ({
					id: item.id || generateId('cost'),
					amount: Number(item.amount) || 0,
					comment: item.comment || '',
				}))
			: [],
		monthlyIncome: Array.isArray(project.monthlyIncome)
			? project.monthlyIncome.map(item => ({
					id: item.id || generateId('income'),
					amount: Number(item.amount) || 0,
					comment: item.comment || '',
				}))
			: [],
		orderIndex: Number.isFinite(project.orderIndex)
			? Number(project.orderIndex)
			: index,
	}))

	const tags: Tag[] = candidate.tags.map(tag => ({
		id: tag.id || generateId('tag'),
		name: tag.name || 'tag',
	}))

	const validProjectIds = new Set(projects.map(project => project.id))

	const links: LinkItem[] = candidate.links
		.map(link => {
			if (!link.projectId || !validProjectIds.has(link.projectId)) return null
			const cleanUrl = link.url || ''
			return {
				id: link.id || generateId('link'),
				projectId: link.projectId,
				title: link.title || 'Untitled',
				description: link.description || '',
				url: cleanUrl,
				tags: Array.isArray(link.tags) ? link.tags : [],
				domain: link.domain || extractDomain(cleanUrl),
				iconCache:
					link.iconCache ||
					(cleanUrl ? faviconProxy(cleanUrl) : DEFAULT_FAVICON),
			}
		})
		.filter(Boolean) as LinkItem[]

	return {
		locale: candidate.locale === 'en' ? 'en' : 'ru',
		projects: projects.sort((a, b) => a.orderIndex - b.orderIndex),
		links,
		tags,
		selectedProjectId:
			candidate.selectedProjectId &&
			validProjectIds.has(candidate.selectedProjectId)
				? candidate.selectedProjectId
				: projects[0]?.id,
		faviconCache: candidate.faviconCache ?? {},
	}
}

export default function App() {
	const [state, setState] = React.useState<AppState | null>(null)
	const [loading, setLoading] = React.useState(true)

	const [settingsOpen, setSettingsOpen] = React.useState(false)
	const [projectModalOpen, setProjectModalOpen] = React.useState(false)
	const [linkModalOpen, setLinkModalOpen] = React.useState(false)
	const [financeModal, setFinanceModal] = React.useState<
		'expenses' | 'income' | null
	>(null)
	const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(
		null,
	)

	const [editingProject, setEditingProject] = React.useState<Project | null>(
		null,
	)
	const [editingLink, setEditingLink] = React.useState<LinkItem | null>(null)

	const [filterTags, setFilterTags] = React.useState<string[]>([])
	const [filterDomains, setFilterDomains] = React.useState<string[]>([])
	const [sortOption, setSortOption] = React.useState<
		'title-asc' | 'title-desc' | 'domain-asc' | 'domain-desc'
	>('title-asc')

	const [draggedProjectId, setDraggedProjectId] = React.useState<string | null>(
		null,
	)
	const [dropProjectId, setDropProjectId] = React.useState<string | null>(null)

	React.useEffect(() => {
		const init = async () => {
			try {
				const stored = await loadState()
				if (stored) {
					setState(normalizeImportedState(stored) ?? createDemoState())
				} else {
					setState(createDemoState())
				}
			} catch {
				setState(createDemoState())
			} finally {
				setLoading(false)
			}
		}
		void init()
	}, [])

	React.useEffect(() => {
		if (!state) return
		const handle = window.setTimeout(() => {
			void saveState(state)
		}, 250)
		return () => window.clearTimeout(handle)
	}, [state])

	const currentProject = React.useMemo(() => {
		if (!state?.selectedProjectId) return null
		return (
			state.projects.find(project => project.id === state.selectedProjectId) ??
			null
		)
	}, [state])
	const locale: Locale = state?.locale === 'en' ? 'en' : 'ru'

	React.useEffect(() => {
		setFilterTags([])
		setFilterDomains([])
	}, [state?.selectedProjectId])

	const orderedProjects = React.useMemo(() => {
		if (!state) return []
		return [...state.projects].sort((a, b) => a.orderIndex - b.orderIndex)
	}, [state])

	const projectLinks = React.useMemo(() => {
		if (!state || !currentProject) return []
		return state.links.filter(link => link.projectId === currentProject.id)
	}, [state, currentProject])

	const domains = React.useMemo(() => {
		return Array.from(new Set(projectLinks.map(link => link.domain))).sort()
	}, [projectLinks])

	const filteredLinks = React.useMemo(() => {
		let list = [...projectLinks]
		if (filterTags.length) {
			list = list.filter(link =>
				filterTags.every(tag => link.tags.includes(tag)),
			)
		}
		if (filterDomains.length) {
			list = list.filter(link => filterDomains.includes(link.domain))
		}
		list.sort((a, b) => {
			if (sortOption === 'title-asc') return a.title.localeCompare(b.title)
			if (sortOption === 'title-desc') return b.title.localeCompare(a.title)
			if (sortOption === 'domain-asc') return a.domain.localeCompare(b.domain)
			return b.domain.localeCompare(a.domain)
		})
		return list
	}, [projectLinks, filterTags, filterDomains, sortOption])

	const handleCreateProject = (data: {
		title: string
		shortDescription: string
	}) => {
		setState(prev => {
			if (!prev) return prev
			const project: Project = {
				id: generateId('project'),
				title: data.title,
				shortDescription: data.shortDescription,
				monthlyOperatingCosts: [],
				monthlyIncome: [],
				orderIndex: prev.projects.length,
			}
			return {
				...prev,
				projects: [...prev.projects, project],
				selectedProjectId: project.id,
			}
		})
		toast.success(t(locale, 'projectCreated'))
	}

	const handleUpdateProject = (
		projectId: string,
		data: { title: string; shortDescription: string },
	) => {
		setState(prev => {
			if (!prev) return prev
			return {
				...prev,
				projects: prev.projects.map(project =>
					project.id === projectId
						? {
								...project,
								title: data.title,
								shortDescription: data.shortDescription,
							}
						: project,
				),
			}
		})
		toast.success(t(locale, 'projectUpdated'))
	}

	const handleDeleteProject = (projectId: string) => {
		setState(prev => {
			if (!prev) return prev
			const projects = prev.projects.filter(project => project.id !== projectId)
			return {
				...prev,
				projects: projects.map((project, index) => ({
					...project,
					orderIndex: index,
				})),
				links: prev.links.filter(link => link.projectId !== projectId),
				selectedProjectId: projects[0]?.id,
			}
		})
		toast.success(t(locale, 'projectDeleted'))
	}

	const handleReorderProjectsByDrop = (sourceId: string, targetId: string) => {
		setState(prev => {
			if (!prev || sourceId === targetId) return prev
			const sorted = [...prev.projects].sort(
				(a, b) => a.orderIndex - b.orderIndex,
			)
			const sourceIndex = sorted.findIndex(p => p.id === sourceId)
			const targetIndex = sorted.findIndex(p => p.id === targetId)
			if (sourceIndex === -1 || targetIndex === -1) return prev
			const [moved] = sorted.splice(sourceIndex, 1)
			sorted.splice(targetIndex, 0, moved)
			return {
				...prev,
				projects: sorted.map((project, index) => ({
					...project,
					orderIndex: index,
				})),
			}
		})
	}

	const handleAddFinanceItem = (
		type: 'expenses' | 'income',
		item: { amount: number; comment: string },
	) => {
		if (!currentProject) return

		const isExpense = type === 'expenses'
		if ((isExpense && item.amount >= 0) || (!isExpense && item.amount <= 0)) {
			toast.error(
				isExpense
					? t(locale, 'expenseMustBeNegative')
					: t(locale, 'incomeMustBePositive'),
			)
			return
		}

		setState(prev => {
			if (!prev) return prev
			return {
				...prev,
				projects: prev.projects.map(project => {
					if (project.id !== currentProject.id) return project
					if (type === 'expenses') {
						return {
							...project,
							monthlyOperatingCosts: [
								...project.monthlyOperatingCosts,
								{
									id: generateId('cost'),
									amount: item.amount,
									comment: item.comment,
								},
							],
						}
					}
					return {
						...project,
						monthlyIncome: [
							...project.monthlyIncome,
							{
								id: generateId('income'),
								amount: item.amount,
								comment: item.comment,
							},
						],
					}
				}),
			}
		})
		toast.success(t(locale, 'recordAdded'))
	}

	const handleDeleteFinanceItem = (
		type: 'expenses' | 'income',
		itemId: string,
	) => {
		if (!currentProject) return
		setState(prev => {
			if (!prev) return prev
			return {
				...prev,
				projects: prev.projects.map(project => {
					if (project.id !== currentProject.id) return project
					if (type === 'expenses') {
						return {
							...project,
							monthlyOperatingCosts: project.monthlyOperatingCosts.filter(
								item => item.id !== itemId,
							),
						}
					}
					return {
						...project,
						monthlyIncome: project.monthlyIncome.filter(
							item => item.id !== itemId,
						),
					}
				}),
			}
		})
		toast.success(t(locale, 'recordDeleted'))
	}

	const handleAddLink = (data: LinkPayload) => {
		if (!currentProject) return
		const domain = extractDomain(data.url)
		const link: LinkItem = {
			id: generateId('link'),
			projectId: currentProject.id,
			title: data.title,
			description: data.description,
			url: data.url,
			tags: data.tags,
			domain,
			iconCache: faviconProxy(data.url),
		}

		setState(prev => (prev ? { ...prev, links: [...prev.links, link] } : prev))
		toast.success(t(locale, 'linkAdded'))
	}

	const handleUpdateLink = (linkId: string, data: LinkPayload) => {
		const domain = extractDomain(data.url)
		setState(prev => {
			if (!prev) return prev
			return {
				...prev,
				links: prev.links.map(link =>
					link.id === linkId
						? {
								...link,
								...data,
								domain,
								iconCache: faviconProxy(data.url),
							}
						: link,
				),
			}
		})
		toast.success(t(locale, 'linkUpdated'))
	}

	const handleDeleteLink = (linkId: string) => {
		setState(prev => {
			if (!prev) return prev
			return { ...prev, links: prev.links.filter(link => link.id !== linkId) }
		})
		toast.success(t(locale, 'linkDeleted'))
	}

	const handleUpdateTags = (tags: Tag[]) => {
		setState(prev => {
			if (!prev) return prev
			const tagIds = new Set(tags.map(tag => tag.id))
			return {
				...prev,
				tags,
				links: prev.links.map(link => ({
					...link,
					tags: link.tags.filter(tagId => tagIds.has(tagId)),
				})),
			}
		})
		toast.success(t(locale, 'tagsSaved'))
	}

	const handleExportDatabase = () => {
		if (!state) return
		const blob = new Blob([JSON.stringify(state, null, 2)], {
			type: 'application/json;charset=utf-8',
		})
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `projecthub-db-${new Date().toISOString().slice(0, 10)}.json`
		document.body.appendChild(link)
		link.click()
		link.remove()
		URL.revokeObjectURL(link.href)
		toast.success(t(locale, 'databaseExported'))
	}

	const handleImportDatabase = async (file: File) => {
		try {
			const text = await file.text()
			const parsed = JSON.parse(text) as unknown
			const normalized = normalizeImportedState(parsed)
			if (!normalized) {
				toast.error(t(locale, 'databaseInvalid'))
				return
			}
			setState(normalized)
			toast.success(t(locale, 'databaseImported'))
		} catch {
			toast.error(t(locale, 'databaseImportError'))
		}
	}

	const handleResetDatabase = () => {
		setState(prev => {
			const next = createDemoState()
			if (prev?.locale) {
				next.locale = prev.locale
			}
			return next
		})
		toast.success(t(locale, 'databaseReset'))
	}

	const handleExportCsv = () => {
		if (!currentProject) return
		const filename = `${currentProject.title}.csv`

		downloadCsv(filename, [
			['Название', 'Описание', 'URL', 'Домен', 'Теги'],
			...filteredLinks.map(link => [
				link.title,
				link.description,
				link.url,
				link.domain,
				link.tags
					.map(tagId => state?.tags.find(tag => tag.id === tagId)?.name)
					.filter(Boolean)
					.join(' | '),
			]),
		])

		toast.success(t(locale, 'csvExported'))
	}

	if (loading) return <div className='p-8 text-sm'>Loading...</div>
	if (!state) return <div className='p-8 text-sm'>Load error</div>

	const totalExpenses = currentProject
		? sumItems(currentProject.monthlyOperatingCosts)
		: 0
	const totalIncome = currentProject
		? sumItems(currentProject.monthlyIncome)
		: 0
	const profit = totalIncome + totalExpenses

	return (
		<div className='min-h-screen bg-background text-foreground'>
			<div className='grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]'>
				<aside className='border-r border-border bg-secondary/80 p-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen'>
					<div className='text-xs font-semibold uppercase tracking-[0.2em]'>
						{t(locale, 'brandName')}
					</div>
					<div className='mt-1 text-xs text-muted-foreground'>
						{t(locale, 'brandBy')}
					</div>

					<div className='my-4 border-t border-border' />

					<Button
						className='w-full justify-center'
						variant='outline'
						onClick={() => setSettingsOpen(true)}
					>
						{t(locale, 'settings')}
					</Button>

					<div className='mt-3'>
						<Combobox
							value={locale}
							onChange={value =>
								setState(prev =>
									prev
										? { ...prev, locale: value === 'en' ? 'en' : 'ru' }
										: prev,
								)
							}
							options={[
								{ value: 'ru', label: 'Русский' },
								{ value: 'en', label: 'English' },
							]}
							placeholder={t(locale, 'language')}
							searchPlaceholder={t(locale, 'language')}
						/>
					</div>

					<p className='mt-6 pl-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
						{t(locale, 'projects')}
					</p>

					<div className='mt-3 space-y-2 overflow-y-auto p-2 scrollbar lg:max-h-[calc(100vh-310px)]'>
						{orderedProjects.map(project => {
							const isActive = project.id === state.selectedProjectId
							return (
								<div
									key={project.id}
									draggable
									onDragStart={() => setDraggedProjectId(project.id)}
									onDragOver={event => {
										event.preventDefault()
										setDropProjectId(project.id)
									}}
									onDrop={event => {
										event.preventDefault()
										if (draggedProjectId) {
											handleReorderProjectsByDrop(draggedProjectId, project.id)
										}
										setDraggedProjectId(null)
										setDropProjectId(null)
									}}
									onDragEnd={() => {
										setDraggedProjectId(null)
										setDropProjectId(null)
									}}
									className={cn(
										'rounded-xl border p-3',
										isActive
											? 'border-border bg-background/80'
											: 'border-transparent bg-background/40',
										dropProjectId === project.id ? 'ring-2 ring-ring' : '',
									)}
								>
									<div className='flex items-start gap-2'>
										<button
											type='button'
											onClick={() =>
												setState(prev =>
													prev
														? { ...prev, selectedProjectId: project.id }
														: prev,
												)
											}
											className='flex-1 text-left'
										>
											<div className='text-sm font-semibold'>
												{project.title}
											</div>
											<div className='text-xs text-muted-foreground'>
												{project.shortDescription || t(locale, 'noDescription')}
											</div>
										</button>
										<GripVertical className='mt-1 h-4 w-4 shrink-0 text-muted-foreground' />
									</div>

									<div className='mt-2 flex items-center justify-start gap-2'>
										<Button
											variant='outline'
											size='sm'
											className='h-6 px-2 text-xs'
											onClick={() => {
												setEditingProject(project)
												setProjectModalOpen(true)
											}}
										>
											{t(locale, 'edit')}
										</Button>
										<Button
											variant='outline'
											size='sm'
											className='h-6 px-2 text-xs'
											onClick={() =>
												setConfirmState({
													title: t(locale, 'confirmDeleteProjectTitle'),
													description: t(
														locale,
														'confirmDeleteProjectDescription',
													),
													onConfirm: () => handleDeleteProject(project.id),
												})
											}
										>
											{t(locale, 'delete')}
										</Button>
									</div>
								</div>
							)
						})}
					</div>

					<Button
						className='mt-4 w-full'
						onClick={() => {
							setEditingProject(null)
							setProjectModalOpen(true)
						}}
					>
						{t(locale, 'addProject')}
					</Button>
				</aside>

				<main className='p-6 lg:p-10'>
					{!currentProject ? (
						<Card className='max-w-xl'>
							<CardContent className='p-6'>
								<h2 className='text-xl font-semibold'>
									{t(locale, 'noProjectsTitle')}
								</h2>
								<p className='mt-2 text-sm text-muted-foreground'>
									{t(locale, 'noProjectsDescription')}
								</p>
								<Button
									className='mt-4'
									onClick={() => {
										setEditingProject(null)
										setProjectModalOpen(true)
									}}
								>
									{t(locale, 'createProject')}
								</Button>
							</CardContent>
						</Card>
					) : (
						<div className='space-y-6'>
							<Card>
								<CardContent className='p-6'>
									<div className='flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between'>
										<div>
											<h1 className='text-2xl font-semibold'>
												{currentProject.title}
											</h1>
											<p className='mt-1 text-sm text-muted-foreground'>
												{currentProject.shortDescription ||
													t(locale, 'noDescription')}
											</p>
										</div>
										<div className='grid w-full grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3'>
											<KpiCard
												label={t(locale, 'kpiExpenses')}
												value={totalExpenses}
												color='danger'
												onClick={() => setFinanceModal('expenses')}
											/>
											<KpiCard
												label={t(locale, 'kpiIncome')}
												value={totalIncome}
												color='success'
												onClick={() => setFinanceModal('income')}
											/>
											<KpiCard
												label={t(locale, 'kpiProfit')}
												value={profit}
												color={profit >= 0 ? 'success' : 'danger'}
												onClick={() => setFinanceModal('income')}
											/>
										</div>
									</div>
								</CardContent>
							</Card>

							<Card>
								<CardContent className='p-6'>
									<div className='flex flex-wrap items-center justify-between gap-3'>
										<div>
											<h2 className='text-lg font-semibold'>
												{t(locale, 'projectLinks')}
											</h2>
											<p className='text-sm text-muted-foreground'>
												{t(locale, 'linksCount', {
													filtered: filteredLinks.length,
													total: projectLinks.length,
												})}
											</p>
										</div>
										<div className='flex flex-wrap gap-2'>
											<Button variant='outline' onClick={handleExportCsv}>
												{t(locale, 'exportCsv')}
											</Button>
											<Button
												onClick={() => {
													setEditingLink(null)
													setLinkModalOpen(true)
												}}
											>
												{t(locale, 'addLink')}
											</Button>
										</div>
									</div>

									<div className='mt-5 grid gap-3 md:grid-cols-2'>
										<ComboboxMultiple
											options={state.tags.map(tag => ({
												value: tag.id,
												label: tag.name,
											}))}
											value={filterTags}
											onChange={setFilterTags}
											placeholder={t(locale, 'filterByTags')}
											searchPlaceholder={t(locale, 'filterByTags')}
											emptyLabel={t(locale, 'emptyValues')}
										/>
										<ComboboxMultiple
											options={domains.map(domain => ({
												value: domain,
												label: domain,
											}))}
											value={filterDomains}
											onChange={setFilterDomains}
											placeholder={t(locale, 'filterByDomains')}
											searchPlaceholder={t(locale, 'filterByDomains')}
											emptyLabel={t(locale, 'emptyValues')}
										/>
									</div>

									{/* <div className="mt-3">
                    <select
                      className="h-10 rounded-md border border-border bg-secondary px-3 text-sm"
                      value={sortOption}
                      onChange={(event) => {
                        setSortOption(
                          event.target.value as
                            | "title-asc"
                            | "title-desc"
                            | "domain-asc"
                            | "domain-desc"
                        );
                      }}
                    >
                      <option value="title-asc">{t(locale, "sortByTitleAsc")}</option>
                      <option value="title-desc">{t(locale, "sortByTitleDesc")}</option>
                      <option value="domain-asc">{t(locale, "sortByDomainAsc")}</option>
                      <option value="domain-desc">{t(locale, "sortByDomainDesc")}</option>
                    </select>
                  </div> */}

									<div className='mt-5 grid gap-4 md:grid-cols-2'>
										{filteredLinks.map(link => (
											<LinkCard
												key={link.id}
												link={link}
												tags={state.tags}
												locale={locale}
												onEdit={() => {
													setEditingLink(link)
													setLinkModalOpen(true)
												}}
												onDelete={() =>
													setConfirmState({
														title: t(locale, 'confirmDeleteLinkTitle'),
														description: link.title,
														onConfirm: () => handleDeleteLink(link.id),
													})
												}
											/>
										))}
										{filteredLinks.length === 0 && (
											<div className='rounded-xl border border-dashed border-border p-6 text-sm text-muted-foreground'>
												{t(locale, 'noLinksForFilters')}
											</div>
										)}
									</div>
								</CardContent>
							</Card>
						</div>
					)}
				</main>
			</div>

			<Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
				<DialogContent>
					<TagSettings
						locale={locale}
						tags={state.tags}
						onClose={() => setSettingsOpen(false)}
						onSave={handleUpdateTags}
						onExport={handleExportDatabase}
						onImport={handleImportDatabase}
						onReset={() =>
							setConfirmState({
								title: t(locale, 'confirmResetDbTitle'),
								description: t(locale, 'confirmResetDbDescription'),
								onConfirm: handleResetDatabase,
							})
						}
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				open={projectModalOpen}
				onOpenChange={open => {
					setProjectModalOpen(open)
					if (!open) setEditingProject(null)
				}}
			>
				<DialogContent>
					<ProjectForm
						locale={locale}
						project={editingProject}
						onClose={() => setProjectModalOpen(false)}
						onSave={data => {
							if (editingProject) {
								handleUpdateProject(editingProject.id, data)
							} else {
								handleCreateProject(data)
							}
							setProjectModalOpen(false)
						}}
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				open={linkModalOpen}
				onOpenChange={open => {
					setLinkModalOpen(open)
					if (!open) setEditingLink(null)
				}}
			>
				<DialogContent>
					<LinkForm
						locale={locale}
						tags={state.tags}
						link={editingLink}
						onClose={() => setLinkModalOpen(false)}
						onSave={data => {
							if (editingLink) {
								handleUpdateLink(editingLink.id, data)
							} else {
								handleAddLink(data)
							}
							setLinkModalOpen(false)
						}}
					/>
				</DialogContent>
			</Dialog>

			<Dialog
				open={financeModal !== null}
				onOpenChange={open => !open && setFinanceModal(null)}
			>
				<DialogContent>
					{financeModal && currentProject && (
						<FinanceModal
							locale={locale}
							type={financeModal}
							items={
								financeModal === 'expenses'
									? currentProject.monthlyOperatingCosts
									: currentProject.monthlyIncome
							}
							onAdd={item => handleAddFinanceItem(financeModal, item)}
							onDelete={itemId =>
								setConfirmState({
									title: t(locale, 'confirmDeleteEntryTitle'),
									description: t(locale, 'confirmDeleteEntryDescription'),
									onConfirm: () =>
										handleDeleteFinanceItem(financeModal, itemId),
								})
							}
							onClose={() => setFinanceModal(null)}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={confirmState !== null}
				onOpenChange={open => !open && setConfirmState(null)}
			>
				<DialogContent>
					{confirmState && (
						<ConfirmDialog
							locale={locale}
							title={confirmState.title}
							description={confirmState.description}
							onCancel={() => setConfirmState(null)}
							onConfirm={() => {
								confirmState.onConfirm()
								setConfirmState(null)
							}}
						/>
					)}
				</DialogContent>
			</Dialog>
		</div>
	)
}

function KpiCard({
	label,
	value,
	color,
	onClick,
}: {
	label: string
	value: number
	color: 'success' | 'danger'
	onClick: () => void
}) {
	return (
		<button
			onClick={onClick}
			className='min-w-[200px] rounded-xl border border-border bg-secondary px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-soft'
		>
			<div className='text-[11px] uppercase tracking-[0.12em] text-muted-foreground'>
				{label}
			</div>
			<div
				className={cn(
					'mt-1 text-lg font-semibold',
					color === 'success' ? 'text-success' : 'text-danger',
				)}
			>
				{formatAmount(value)}
			</div>
		</button>
	)
}

function LinkCard({
	link,
	tags,
	locale,
	onEdit,
	onDelete,
}: {
	link: LinkItem
	tags: Tag[]
	locale: Locale
	onEdit: () => void
	onDelete: () => void
}) {
	const tagLabels = link.tags
		.map(tagId => tags.find(tag => tag.id === tagId)?.name)
		.filter(Boolean) as string[]

	return (
		<div className='rounded-xl border border-border bg-secondary p-4 transition hover:shadow-soft'>
			<a href={link.url} target='_blank' rel='noreferrer' className='block'>
				<div className='flex items-start gap-3'>
					<img
						src={link.iconCache || faviconProxy(link.url)}
						alt='favicon'
						className='h-10 w-10 rounded-md border border-border bg-muted'
						onError={event => {
							;(event.currentTarget as HTMLImageElement).src = DEFAULT_FAVICON
						}}
					/>
					<div className='min-w-0 flex-1'>
						<div className='truncate text-sm font-semibold'>{link.title}</div>
						<div className='mt-1 text-xs text-muted-foreground'>
							{link.description}
						</div>
					</div>
				</div>

				<div className='mt-3 flex flex-wrap items-center gap-2'>
					<Badge variant='outline'>{link.domain}</Badge>
					{tagLabels.map(label => (
						<Badge key={`${link.id}-${label}`} variant='outline'>
							{label}
						</Badge>
					))}
				</div>
			</a>

			<div className='mt-3 flex justify-end gap-2'>
				<Button variant='ghost' size='sm' onClick={onEdit}>
					<Pencil className='mr-1 h-4 w-4' />
					{t(locale, 'edit')}
				</Button>
				<Button variant='ghost' size='sm' onClick={onDelete}>
					<Trash2 className='mr-1 h-4 w-4' />
					{t(locale, 'delete')}
				</Button>
			</div>
		</div>
	)
}

function ProjectForm({
	locale,
	project,
	onSave,
	onClose,
}: {
	locale: Locale
	project: Project | null
	onSave: (data: { title: string; shortDescription: string }) => void
	onClose: () => void
}) {
	const [title, setTitle] = React.useState(project?.title ?? '')
	const [description, setDescription] = React.useState(
		project?.shortDescription ?? '',
	)

	return (
		<div>
			<DialogHeader>
				<DialogTitle>
					{project ? t(locale, 'editProject') : t(locale, 'newProject')}
				</DialogTitle>
				<DialogDescription>{t(locale, 'projectNameHint')}</DialogDescription>
			</DialogHeader>

			<div className='mt-4 space-y-3'>
				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'projectName')}
					</label>
					<Input
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>

				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'projectDescription')}
					</label>
					<Textarea
						value={description}
						onChange={event => setDescription(event.target.value)}
					/>
				</div>
			</div>

			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onClose}>
					{t(locale, 'cancel')}
				</Button>
				<Button
					onClick={() => {
						const cleanTitle = title.trim()
						if (!cleanTitle) {
							toast.error(t(locale, 'projectTitleRequired'))
							return
						}
						onSave({ title: cleanTitle, shortDescription: description.trim() })
					}}
				>
					{t(locale, 'save')}
				</Button>
			</DialogFooter>
		</div>
	)
}

function FinanceModal({
	locale,
	type,
	items,
	onAdd,
	onDelete,
	onClose,
}: {
	locale: Locale
	type: 'expenses' | 'income'
	items: IncomeExpenseItem[]
	onAdd: (item: { amount: number; comment: string }) => void
	onDelete: (itemId: string) => void
	onClose: () => void
}) {
	const [amount, setAmount] = React.useState('')
	const [comment, setComment] = React.useState('')

	return (
		<div>
			<DialogHeader>
				<DialogTitle>
					{type === 'expenses'
						? t(locale, 'financeExpenses')
						: t(locale, 'financeIncome')}
				</DialogTitle>
			</DialogHeader>

			<div className='mt-4 rounded-xl border border-border bg-muted p-4'>
				<p className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
					{type === 'expenses'
						? t(locale, 'addMonthlyExpense')
						: t(locale, 'addMonthlyIncome')}
				</p>
				<div className='mt-3 grid gap-2 sm:grid-cols-[150px_1fr_auto]'>
					<Input
						placeholder={type === 'expenses' ? '-1000' : '1500'}
						value={amount}
						onChange={event => setAmount(event.target.value)}
					/>
					<Input
						placeholder={t(locale, 'comment')}
						value={comment}
						onChange={event => setComment(event.target.value)}
					/>
					<Button
						onClick={() => {
							const parsed = Number(amount.replace(/\s/g, ''))
							if (!Number.isFinite(parsed) || parsed === 0) {
								toast.error(t(locale, 'enterValidAmount'))
								return
							}
							onAdd({ amount: parsed, comment: comment.trim() })
							setAmount('')
							setComment('')
						}}
					>
						{t(locale, 'add')}
					</Button>
				</div>
			</div>

			<div className='mt-4 space-y-2'>
				{items.map(item => (
					<div
						key={item.id}
						className='flex items-center justify-between rounded-xl border border-border bg-secondary px-3 py-2'
					>
						<div>
							<div
								className={cn(
									'text-sm font-semibold',
									item.amount < 0 ? 'text-danger' : 'text-success',
								)}
							>
								{formatAmount(item.amount)}
							</div>
							<div className='text-xs text-muted-foreground'>
								{item.comment || t(locale, 'noComment')}
							</div>
						</div>
						<Button variant='ghost' size='sm' onClick={() => onDelete(item.id)}>
							{t(locale, 'delete')}
						</Button>
					</div>
				))}
				{items.length === 0 && (
					<div className='rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground'>
						{t(locale, 'noEntries')}
					</div>
				)}
			</div>

			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onClose}>
					{t(locale, 'close')}
				</Button>
			</DialogFooter>
		</div>
	)
}

function LinkForm({
	locale,
	tags,
	link,
	onSave,
	onClose,
}: {
	locale: Locale
	tags: Tag[]
	link: LinkItem | null
	onSave: (data: LinkPayload) => void
	onClose: () => void
}) {
	const [title, setTitle] = React.useState(link?.title ?? '')
	const [description, setDescription] = React.useState(link?.description ?? '')
	const [url, setUrl] = React.useState(link?.url ?? '')
	const [selectedTags, setSelectedTags] = React.useState<string[]>(
		link?.tags ?? [],
	)

	return (
		<div>
			<DialogHeader>
				<DialogTitle>
					{link ? t(locale, 'editLinkTitle') : t(locale, 'addLinkTitle')}
				</DialogTitle>
				<DialogDescription>{t(locale, 'linkRequiredHint')}</DialogDescription>
			</DialogHeader>

			<div className='mt-4 space-y-3'>
				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'linkName')}
					</label>
					<Input
						value={title}
						onChange={event => setTitle(event.target.value)}
					/>
				</div>
				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'linkDescription')}
					</label>
					<Textarea
						value={description}
						onChange={event => setDescription(event.target.value)}
					/>
				</div>
				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'linkUrl')}
					</label>
					<Input value={url} onChange={event => setUrl(event.target.value)} />
				</div>
				<div>
					<label className='mb-1 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
						{t(locale, 'linkTags')}
					</label>
					<ComboboxMultiple
						options={tags.map(tag => ({ value: tag.id, label: tag.name }))}
						value={selectedTags}
						onChange={setSelectedTags}
						placeholder={t(locale, 'chooseTags')}
						searchPlaceholder={t(locale, 'linkTags')}
						emptyLabel={t(locale, 'emptyValues')}
					/>
				</div>
			</div>

			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onClose}>
					{t(locale, 'cancel')}
				</Button>
				<Button
					onClick={() => {
						const cleanTitle = title.trim()
						const cleanUrl = url.trim()
						if (!cleanTitle) {
							toast.error(t(locale, 'linkTitleRequired'))
							return
						}
						try {
							const parsed = new URL(cleanUrl)
							if (!parsed.hostname) throw new Error('invalid')
						} catch {
							toast.error(t(locale, 'enterValidUrl'))
							return
						}
						onSave({
							title: cleanTitle,
							description: description.trim(),
							url: cleanUrl,
							tags: selectedTags,
						})
					}}
				>
					{t(locale, 'save')}
				</Button>
			</DialogFooter>
		</div>
	)
}

function TagSettings({
	locale,
	tags,
	onSave,
	onClose,
	onExport,
	onImport,
	onReset,
}: {
	locale: Locale
	tags: Tag[]
	onSave: (tags: Tag[]) => void
	onClose: () => void
	onExport: () => void
	onImport: (file: File) => Promise<void>
	onReset: () => void
}) {
	const [localTags, setLocalTags] = React.useState(tags)
	const [newTag, setNewTag] = React.useState('')
	const fileInputRef = React.useRef<HTMLInputElement | null>(null)

	React.useEffect(() => {
		setLocalTags(tags)
	}, [tags])

	return (
		<div>
			<DialogHeader>
				<DialogTitle>{t(locale, 'globalTags')}</DialogTitle>
			</DialogHeader>

			<div className='mt-4 space-y-2'>
				{localTags.map(tag => (
					<div key={tag.id} className='flex items-center gap-2'>
						<Input
							value={tag.name}
							onChange={event => {
								setLocalTags(prev =>
									prev.map(item =>
										item.id === tag.id
											? { ...item, name: event.target.value }
											: item,
									),
								)
							}}
						/>
						<Button
							variant='ghost'
							onClick={() => {
								setLocalTags(prev => prev.filter(item => item.id !== tag.id))
							}}
						>
							{t(locale, 'delete')}
						</Button>
					</div>
				))}
			</div>

			<div className='mt-4 rounded-xl border border-border bg-muted p-3'>
				<div className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
					{t(locale, 'addTag')}
				</div>
				<div className='mt-2 flex gap-2'>
					<Input
						value={newTag}
						onChange={event => setNewTag(event.target.value)}
						placeholder={t(locale, 'addTagPlaceholder')}
					/>
					<Button
						onClick={() => {
							const cleanTag = newTag.trim()
							if (!cleanTag) {
								toast.error(t(locale, 'tagNameRequired'))
								return
							}
							setLocalTags(prev => [
								...prev,
								{ id: generateId('tag'), name: cleanTag },
							])
							setNewTag('')
						}}
					>
						{t(locale, 'addTag')}
					</Button>
				</div>
			</div>

			<div className='mt-4 rounded-xl border border-border bg-muted p-3'>
				<div className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
					{t(locale, 'database')}
				</div>
				<div className='mt-2 flex flex-wrap gap-2'>
					<Button variant='outline' onClick={onExport}>
						{t(locale, 'exportDatabase')}
					</Button>
					<Button
						variant='outline'
						onClick={() => {
							fileInputRef.current?.click()
						}}
					>
						{t(locale, 'importDatabase')}
					</Button>
					<Button variant='destructive' onClick={onReset}>
						{t(locale, 'resetDatabase')}
					</Button>
					<input
						ref={fileInputRef}
						type='file'
						accept='application/json'
						className='hidden'
						onChange={async event => {
							const file = event.target.files?.[0]
							if (!file) return
							await onImport(file)
							event.currentTarget.value = ''
						}}
					/>
				</div>
			</div>

			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onClose}>
					{t(locale, 'cancel')}
				</Button>
				<Button
					onClick={() => {
						const cleaned = localTags
							.map(tag => ({ ...tag, name: tag.name.trim() }))
							.filter(tag => tag.name.length > 0)

						onSave(cleaned)
						onClose()
					}}
				>
					{t(locale, 'save')}
				</Button>
			</DialogFooter>
		</div>
	)
}

function ConfirmDialog({
	locale,
	title,
	description,
	onCancel,
	onConfirm,
}: {
	locale: Locale
	title: string
	description: string
	onCancel: () => void
	onConfirm: () => void
}) {
	return (
		<div>
			<DialogHeader>
				<DialogTitle>{title}</DialogTitle>
				<DialogDescription>{description}</DialogDescription>
			</DialogHeader>
			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onCancel}>
					{t(locale, 'cancel')}
				</Button>
				<Button variant='destructive' onClick={onConfirm}>
					{t(locale, 'confirm')}
				</Button>
			</DialogFooter>
		</div>
	)
}
