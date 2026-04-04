import {
	Cloud,
	CloudOff,
	GripVertical,
	Languages,
	Pencil,
	Settings,
	ShieldAlert,
	Star,
	Trash2,
} from 'lucide-react'
import * as React from 'react'
import { toast } from 'sonner'
import { Badge } from './components/ui/badge'
import { Button } from './components/ui/button'
import { Card, CardContent } from './components/ui/card'
import { Checkbox } from './components/ui/checkbox'
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
	ImportSingleProjectResult,
	LinkItem,
	Project,
	SingleProjectExport,
	Tag,
	clearLastExportTimestamp,
	exportSingleProject,
	importSingleProject,
	loadLastExportTimestamp,
	loadState,
	saveLastExportTimestamp,
	saveState,
} from './lib/db'
import { Locale, t } from './lib/i18n'
import {
	cn,
	downloadCsv,
	extractDomain,
	formatAmount,
	isSafeExternalUrl,
	isSafeImageUrl,
} from './lib/utils'

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

type ProjectImportConflictState = {
	projectName: string
	jsonData: SingleProjectExport
	suggestedName: string
}

type ExternalLinkWarningState = {
	projectId: string
	projectTitle: string
	url: string
}

const BACKUP_FRESH_DAYS = 7
const GITHUB_URL = 'https://github.com/v-core-tech/ProjectHub_vcore'
const MAX_PROJECT_IMPORT_FILE_BYTES = 1024 * 1024

function generateId(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}`
}

function formatFileSize(bytes: number) {
	if (bytes >= 1024 * 1024) {
		return `${(bytes / (1024 * 1024)).toFixed(0)} MB`
	}
	if (bytes >= 1024) {
		return `${Math.ceil(bytes / 1024)} KB`
	}
	return `${bytes} B`
}

function normalizeProjectPreferences(
	preferences: Project['preferences'] | undefined,
) {
	return {
		showBudgets: preferences?.showBudgets ?? true,
		isTrusted: preferences?.isTrusted ?? true,
	}
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
		preferences: { showBudgets: true, isTrusted: true },
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
	return `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`
}

function hashSnapshot(value: string) {
	let hash = 2166136261
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index)
		hash = Math.imul(hash, 16777619)
	}
	return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function normalizeBackupSignature(signature: unknown) {
	if (typeof signature !== 'string' || signature.length === 0) return undefined
	return signature.startsWith('{') ? hashSnapshot(signature) : signature
}

function getBackupSignature(state: AppState) {
	const snapshot = {
		locale: state.locale,
		projects: state.projects,
		links: state.links,
		tags: state.tags,
		selectedProjectId: state.selectedProjectId,
		faviconCache: state.faviconCache,
	}
	return hashSnapshot(JSON.stringify(snapshot))
}

function getDaysSince(dateIso: string | null) {
	if (!dateIso) return null
	const parsed = new Date(dateIso)
	if (Number.isNaN(parsed.getTime())) return null
	const diffMs = Date.now() - parsed.getTime()
	return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))
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
		preferences: normalizeProjectPreferences(project.preferences),
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
		lastExportSignature: normalizeBackupSignature(
			candidate.lastExportSignature,
		),
	}
}

function extractImportedLastExportTimestamp(raw: unknown): string | null {
	if (!raw || typeof raw !== 'object') return null
	const candidate = raw as { lastExportTimestamp?: unknown }
	return typeof candidate.lastExportTimestamp === 'string'
		? candidate.lastExportTimestamp
		: null
}

export default function App() {
	const [state, setState] = React.useState<AppState | null>(null)
	const [loading, setLoading] = React.useState(true)
	const [lastExportTimestamp, setLastExportTimestamp] = React.useState<string | null>(
		null,
	)

	const [settingsOpen, setSettingsOpen] = React.useState(false)
	const [databaseOpen, setDatabaseOpen] = React.useState(false)
	const [projectModalOpen, setProjectModalOpen] = React.useState(false)
	const [linkModalOpen, setLinkModalOpen] = React.useState(false)
	const [financeModal, setFinanceModal] = React.useState<
		'expenses' | 'income' | null
	>(null)
	const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(
		null,
	)
	const [projectImportConflict, setProjectImportConflict] =
		React.useState<ProjectImportConflictState | null>(null)
	const [projectImportRename, setProjectImportRename] = React.useState('')
	const [externalLinkWarning, setExternalLinkWarning] =
		React.useState<ExternalLinkWarningState | null>(null)
	const [trustConfirmProjectId, setTrustConfirmProjectId] = React.useState<
		string | null
	>(null)

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
	const projectImportInputRef = React.useRef<HTMLInputElement | null>(null)

	React.useEffect(() => {
		const init = async () => {
			try {
				const stored = await loadState()
				const exportTimestamp = await loadLastExportTimestamp()
				setLastExportTimestamp(exportTimestamp)
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
	const currentSignature = state ? getBackupSignature(state) : null
	const hasChangesSinceExport = state
		? !state.lastExportSignature || state.lastExportSignature !== currentSignature
		: false
	const daysSinceExport = getDaysSince(lastExportTimestamp)
	const exportIsFresh =
		daysSinceExport !== null && daysSinceExport <= BACKUP_FRESH_DAYS
	const syncStatus = !hasChangesSinceExport && exportIsFresh ? 'safe' : 'risk'
	const syncStatusText =
		syncStatus === 'safe'
			? t(locale, 'syncStatusSafe')
			: t(locale, 'syncStatusRisk')
	const sidebarSyncStatusText =
		syncStatus === 'safe'
			? t(locale, 'sidebarSyncStatusSafe')
			: t(locale, 'sidebarSyncStatusRisk')
	const syncStatusTooltip =
		syncStatus === 'safe'
			? t(locale, 'syncStatusSafeHint', {
					days: daysSinceExport ?? 0,
					maxDays: BACKUP_FRESH_DAYS,
				})
			: daysSinceExport === null
				? t(locale, 'syncStatusNeverExported')
				: t(locale, 'syncStatusRiskHint', { days: daysSinceExport })

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

	React.useEffect(() => {
		if ((currentProject?.preferences?.showBudgets ?? true) || financeModal === null) {
			return
		}
		setFinanceModal(null)
	}, [currentProject?.preferences?.showBudgets, financeModal])

	const trustConfirmProject = React.useMemo(
		() =>
			trustConfirmProjectId && state
				? state.projects.find(project => project.id === trustConfirmProjectId) ?? null
				: null,
		[state, trustConfirmProjectId],
	)

	const handleOpenProjectLink = (link: LinkItem) => {
		if (!currentProject || !isSafeExternalUrl(link.url)) return
		if (currentProject.preferences?.isTrusted ?? true) {
			window.open(link.url, '_blank', 'noopener,noreferrer')
			return
		}
		setExternalLinkWarning({
			projectId: currentProject.id,
			projectTitle: currentProject.title,
			url: link.url,
		})
	}

	const handleTrustProject = (projectId: string) => {
		setState(prev => {
			if (!prev) return prev
			return {
				...prev,
				projects: prev.projects.map(project =>
					project.id === projectId
						? {
								...project,
								preferences: {
									showBudgets: project.preferences?.showBudgets ?? true,
									isTrusted: true,
								},
							}
						: project,
				),
			}
		})
		setTrustConfirmProjectId(null)
		setExternalLinkWarning(null)
		toast.success(t(locale, 'projectMarkedTrusted'))
	}

	const handleCreateProject = (data: {
		title: string
		shortDescription: string
		showBudgets: boolean
	}) => {
		setState(prev => {
			if (!prev) return prev
			const project: Project = {
				id: generateId('project'),
				title: data.title,
				shortDescription: data.shortDescription,
				monthlyOperatingCosts: [],
				monthlyIncome: [],
				preferences: { showBudgets: data.showBudgets, isTrusted: true },
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
		data: { title: string; shortDescription: string; showBudgets: boolean },
	) => {
		const previousProject = state?.projects.find(project => project.id === projectId)
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
								preferences: {
									showBudgets: data.showBudgets,
									isTrusted: project.preferences?.isTrusted ?? true,
								},
							}
						: project,
				),
			}
		})
		if (
			previousProject &&
			(previousProject.preferences?.showBudgets ?? true) !== data.showBudgets
		) {
			toast.success(t(locale, 'financeVisibilityUpdated'))
			return
		}
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
		const exportedAt = new Date().toISOString()
		const exportSignature = getBackupSignature(state)
		const exportPayload = {
			...state,
			lastExportSignature: exportSignature,
			lastExportTimestamp: exportedAt,
		}
		const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
			type: 'application/json;charset=utf-8',
		})
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = `projecthub-db-${new Date().toISOString().slice(0, 10)}.json`
		document.body.appendChild(link)
		link.click()
		link.remove()
		URL.revokeObjectURL(link.href)
		void saveLastExportTimestamp(exportedAt)
		setLastExportTimestamp(exportedAt)
		setState(prev =>
			prev ? { ...prev, lastExportSignature: exportSignature } : prev,
		)
		toast.success(t(locale, 'databaseExported'))
	}

	const handleImportDatabase = async (file: File) => {
		try {
			const text = await file.text()
			const parsed = JSON.parse(text) as unknown
			const normalized = normalizeImportedState(parsed)
			const importedLastExportTimestamp =
				extractImportedLastExportTimestamp(parsed)
			if (!normalized) {
				toast.error(t(locale, 'databaseInvalid'))
				return
			}
			setState(normalized)
			setLastExportTimestamp(importedLastExportTimestamp)
			if (importedLastExportTimestamp) {
				await saveLastExportTimestamp(importedLastExportTimestamp)
			} else {
				await clearLastExportTimestamp()
			}
			toast.success(t(locale, 'databaseImported'))
		} catch {
			toast.error(t(locale, 'databaseImportError'))
		}
	}

	const downloadJsonFile = (filename: string, payload: unknown) => {
		const blob = new Blob([JSON.stringify(payload, null, 2)], {
			type: 'application/json;charset=utf-8',
		})
		const link = document.createElement('a')
		link.href = URL.createObjectURL(blob)
		link.download = filename
		document.body.appendChild(link)
		link.click()
		link.remove()
		URL.revokeObjectURL(link.href)
	}

	const handleExportProject = async () => {
		if (!currentProject || !state) return
		await saveState(state)
		const result = await exportSingleProject(currentProject.id)
		if (!result) {
			toast.error(t(locale, 'projectExportError'))
			return
		}
		downloadJsonFile(result.filename, result.payload)
		toast.success(t(locale, 'projectExported', { name: currentProject.title }))
	}

	const processProjectImportResult = (
		result: ImportSingleProjectResult,
		jsonData?: SingleProjectExport,
	) => {
		if (result.status === 'invalid') {
			toast.error(
				t(locale, 'projectImportInvalidDetailed', {
					reason: t(locale, `projectImportReason.${result.reason}`),
				}),
			)
			return
		}

		if (result.status === 'conflict') {
			setProjectImportConflict({
				projectName: result.projectName,
				jsonData: jsonData ?? result.jsonData,
				suggestedName: result.suggestedName,
			})
			setProjectImportRename(result.suggestedName)
			return
		}

		setProjectImportConflict(null)
		setProjectImportRename('')
		setState(result.state)
		toast.success(
			t(locale, 'projectImportedSuccess', {
				name: result.projectName,
				links: result.importedLinks,
				finance: result.importedFinanceRecords,
			}),
		)
	}

	const handleImportProjectData = async (
		jsonData: unknown,
		options?: { conflictResolution?: 'rename' | 'skip'; newProjectName?: string },
	) => {
		try {
			const result = await importSingleProject(jsonData, {
				baseState: state ?? undefined,
				...options,
			})
			processProjectImportResult(
				result,
				jsonData as SingleProjectExport | undefined,
			)
		} catch {
			toast.error(t(locale, 'projectImportError'))
		}
	}

	const handleImportProjectFile = async (file: File) => {
		if (file.size > MAX_PROJECT_IMPORT_FILE_BYTES) {
			toast.error(
				t(locale, 'projectImportFileTooLarge', {
					size: formatFileSize(MAX_PROJECT_IMPORT_FILE_BYTES),
				}),
			)
			return
		}
		try {
			const text = await file.text()
			const parsed = JSON.parse(text) as unknown
			await handleImportProjectData(parsed)
		} catch {
			toast.error(t(locale, 'projectImportError'))
		}
	}

	const handleOpenProjectImportPicker = () => {
		if (!projectImportInputRef.current) return
		projectImportInputRef.current.value = ''
		projectImportInputRef.current.click()
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
	const showBudgets = currentProject?.preferences?.showBudgets ?? true
	const profit = totalIncome + totalExpenses

	return (
		<div className='min-h-screen bg-background text-foreground'>
			<div className='grid min-h-screen grid-cols-1 lg:grid-cols-[300px_1fr]'>
				<aside className='flex flex-col border-r border-border bg-secondary/80 p-6 backdrop-blur lg:sticky lg:top-0 lg:h-screen'>
					<div className='text-xs font-semibold uppercase tracking-[0.2em]'>
						{t(locale, 'brandName')}
					</div>
					<div className='mt-1 text-xs text-muted-foreground'>
						{t(locale, 'brandBy')}
					</div>

					<div className='mt-3 flex items-center gap-2'>
						<Button
							variant='outline'
							size='icon'
							className='h-10 w-10 shrink-0'
							onClick={() => setSettingsOpen(true)}
							title={t(locale, 'settings')}
							aria-label={t(locale, 'settings')}
						>
							<Settings className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-10 w-10 shrink-0'
							onClick={() =>
								setState(prev =>
									prev
										? { ...prev, locale: prev.locale === 'en' ? 'ru' : 'en' }
										: prev,
								)
							}
							title={t(locale, 'language')}
							aria-label={t(locale, 'language')}
						>
							<Languages className='h-4 w-4' />
						</Button>
						<Button
							variant='outline'
							size='icon'
							className='h-10 w-10 shrink-0'
							title={syncStatusTooltip}
							aria-label={sidebarSyncStatusText}
							onClick={() => setDatabaseOpen(true)}
						>
							<span
								className='sr-only'
								role='status'
								aria-live='polite'
								aria-atomic='true'
							>
								{sidebarSyncStatusText}
							</span>
							{syncStatus === 'safe' ? (
								<Cloud className='h-4 w-4 text-success' />
							) : (
								<CloudOff className='h-4 w-4 text-danger' />
							)}
						</Button>
					</div>

					<div className='my-4 border-t border-border' />

					<Button
						className='w-full'
						onClick={() => {
							setEditingProject(null)
							setProjectModalOpen(true)
						}}
					>
						{t(locale, 'addProject')}
					</Button>

					<Button
						className='mt-3 w-full justify-center'
						variant='outline'
						onClick={handleOpenProjectImportPicker}
					>
						{t(locale, 'importProject')}
					</Button>
					<input
						ref={projectImportInputRef}
						type='file'
						accept='application/json'
						className='hidden'
						onChange={async event => {
							const file = event.target.files?.[0]
							if (!file) return
							await handleImportProjectFile(file)
							event.currentTarget.value = ''
						}}
					/>

					<p className='mt-6 pl-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
						{t(locale, 'projects')}
					</p>

					<div className='mt-3 flex-1 space-y-2 overflow-y-auto p-2 scrollbar lg:max-h-[calc(100vh-390px)]'>
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
											className='min-w-0 flex-1 text-left'
											title={project.shortDescription || t(locale, 'noDescription')}
										>
											<div className='truncate text-sm font-semibold' title={project.title}>
												{project.title}
											</div>
											<div
												className='truncate text-xs text-muted-foreground'
												title={project.shortDescription || t(locale, 'noDescription')}
											>
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

					<div className='mt-6 space-y-2 border-t border-border pt-4'>
						<Button variant='outline' className='w-full justify-start' asChild>
							<a href={GITHUB_URL} target='_blank' rel='noreferrer'>
								<Star className='mr-2 h-4 w-4' />
								{t(locale, 'star on Github')}
							</a>
						</Button>
					</div>
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
									<div className='flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between'>
										<div className='w-full max-w-3xl flex-1'>
											<h1 className='break-words text-2xl font-semibold'>
												{currentProject.title}
											</h1>
											<p className='mt-2 max-w-3xl break-words text-sm leading-6 text-muted-foreground overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3]'>
												{currentProject.shortDescription ||
													t(locale, 'noDescription')}
											</p>
											<button
												type='button'
												className='mt-2 text-sm font-medium text-sky-400 transition hover:text-sky-300'
												onClick={() => {
													setEditingProject(currentProject)
													setProjectModalOpen(true)
												}}
											>
												{t(locale, 'readMore')}
											</button>
										</div>
										{showBudgets && (
											<div className='grid w-full shrink-0 grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3 xl:max-w-[720px]'>
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
										)}
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
											<Button variant='outline' onClick={handleExportProject}>
												{t(locale, 'exportProject')}
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
													isTrustedProject={
														currentProject?.preferences?.isTrusted ?? true
													}
													onOpen={() => handleOpenProjectLink(link)}
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
					/>
				</DialogContent>
			</Dialog>

			<Dialog open={databaseOpen} onOpenChange={setDatabaseOpen}>
				<DialogContent>
					<DatabaseSettings
						locale={locale}
						lastExportTimestamp={lastExportTimestamp}
						syncStatus={syncStatus}
						syncStatusText={syncStatusText}
						syncStatusTooltip={syncStatusTooltip}
						onClose={() => setDatabaseOpen(false)}
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
				open={showBudgets && financeModal !== null}
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

			<Dialog
				open={projectImportConflict !== null}
				onOpenChange={open => {
					if (!open) {
						setProjectImportConflict(null)
						setProjectImportRename('')
					}
				}}
			>
				<DialogContent>
					{projectImportConflict && (
						<div>
							<DialogHeader>
								<DialogTitle>{t(locale, 'projectImportConflictTitle')}</DialogTitle>
								<DialogDescription>
									{t(locale, 'projectImportConflictDescription', {
										name: projectImportConflict.projectName,
									})}
								</DialogDescription>
							</DialogHeader>

							<div className='mt-4 space-y-2'>
								<label
									htmlFor='project-import-rename'
									className='text-sm font-medium'
								>
									{t(locale, 'projectImportRenameLabel')}
								</label>
								<Input
									id='project-import-rename'
									value={projectImportRename}
									onChange={event => setProjectImportRename(event.target.value)}
									placeholder={projectImportConflict.suggestedName}
								/>
							</div>

							<DialogFooter className='mt-6'>
								<Button
									variant='outline'
									onClick={() => {
										setProjectImportConflict(null)
										setProjectImportRename('')
									}}
								>
									{t(locale, 'skip')}
								</Button>
								<Button
									onClick={async () => {
										const cleanName = projectImportRename.trim()
										if (!cleanName) {
											toast.error(t(locale, 'projectTitleRequired'))
											return
										}
										await handleImportProjectData(
											projectImportConflict.jsonData,
											{
												conflictResolution: 'rename',
												newProjectName: cleanName,
											},
										)
									}}
								>
									{t(locale, 'renameAndImport')}
								</Button>
							</DialogFooter>
						</div>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={externalLinkWarning !== null}
				onOpenChange={open => !open && setExternalLinkWarning(null)}
			>
				<DialogContent>
					{externalLinkWarning && (
						<ExternalLinkWarningDialog
							locale={locale}
							projectTitle={externalLinkWarning.projectTitle}
							url={externalLinkWarning.url}
							onCancel={() => setExternalLinkWarning(null)}
							onProceed={() => {
								window.open(
									externalLinkWarning.url,
									'_blank',
									'noopener,noreferrer',
								)
								setExternalLinkWarning(null)
							}}
							onTrustProject={() => {
								setExternalLinkWarning(null)
								setTrustConfirmProjectId(externalLinkWarning.projectId)
							}}
						/>
					)}
				</DialogContent>
			</Dialog>

			<Dialog
				open={trustConfirmProject !== null}
				onOpenChange={open => !open && setTrustConfirmProjectId(null)}
			>
				<DialogContent>
					{trustConfirmProject && (
						<TrustProjectDialog
							locale={locale}
							projectTitle={trustConfirmProject.title}
							onCancel={() => setTrustConfirmProjectId(null)}
							onConfirm={() => handleTrustProject(trustConfirmProject.id)}
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
	isTrustedProject,
	onOpen,
	onEdit,
	onDelete,
}: {
	link: LinkItem
	tags: Tag[]
	locale: Locale
	isTrustedProject: boolean
	onOpen: () => void
	onEdit: () => void
	onDelete: () => void
}) {
	const tagLabels = link.tags
		.map(tagId => tags.find(tag => tag.id === tagId)?.name)
		.filter(Boolean) as string[]
	const safeLinkUrl = isSafeExternalUrl(link.url) ? link.url : null
	const safeIconUrl =
		link.iconCache && isSafeImageUrl(link.iconCache)
			? link.iconCache
			: faviconProxy(link.url)
	const content = (
		<>
			<div className='flex items-start gap-3'>
				<img
					src={safeIconUrl}
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
		</>
	)

	return (
		<div className='rounded-xl border border-border bg-secondary p-4 transition hover:shadow-soft'>
			{safeLinkUrl ? (
				<button
					type='button'
					onClick={onOpen}
					className='block w-full text-left'
					title={
						isTrustedProject
							? safeLinkUrl
							: t(locale, 'externalLinkWarningTrigger')
					}
				>
					{content}
				</button>
			) : (
				<div className='block'>{content}</div>
			)}

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
	onSave: (data: {
		title: string
		shortDescription: string
		showBudgets: boolean
	}) => void
	onClose: () => void
}) {
	const [title, setTitle] = React.useState(project?.title ?? '')
	const [description, setDescription] = React.useState(
		project?.shortDescription ?? '',
	)
	const [showBudgets, setShowBudgets] = React.useState(
		project?.preferences?.showBudgets ?? true,
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

				<div className='rounded-xl border border-border bg-muted p-3'>
					<label className='flex cursor-pointer items-start gap-3'>
						<Checkbox
							checked={showBudgets}
							onCheckedChange={checked => setShowBudgets(checked === true)}
							className='mt-0.5'
						/>
						<div>
							<div className='text-sm font-medium text-foreground'>
								{t(locale, 'showBudgets')}
							</div>
							<p className='mt-1 text-sm text-muted-foreground'>
								{t(locale, 'showBudgetsHint')}
							</p>
						</div>
					</label>
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
						onSave({
							title: cleanTitle,
							shortDescription: description.trim(),
							showBudgets,
						})
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
							if (!parsed.hostname || !isSafeExternalUrl(cleanUrl)) {
								throw new Error('invalid')
							}
						} catch {
							toast.error(t(locale, 'enterSafeHttpUrl'))
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
}: {
	locale: Locale
	tags: Tag[]
	onSave: (tags: Tag[]) => void
	onClose: () => void
}) {
	const [localTags, setLocalTags] = React.useState(tags)
	const [newTag, setNewTag] = React.useState('')

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

function DatabaseSettings({
	locale,
	lastExportTimestamp,
	syncStatus,
	syncStatusText,
	syncStatusTooltip,
	onClose,
	onExport,
	onImport,
	onReset,
}: {
	locale: Locale
	lastExportTimestamp: string | null
	syncStatus: 'safe' | 'risk'
	syncStatusText: string
	syncStatusTooltip: string
	onClose: () => void
	onExport: () => void
	onImport: (file: File) => Promise<void>
	onReset: () => void
}) {
	const fileInputRef = React.useRef<HTMLInputElement | null>(null)
	const exportButtonRef = React.useRef<HTMLButtonElement | null>(null)

	React.useEffect(() => {
		exportButtonRef.current?.focus()
	}, [])

	const lastExportLabel = lastExportTimestamp
		? new Date(lastExportTimestamp).toLocaleString(
				locale === 'ru' ? 'ru-RU' : 'en-US',
			)
		: t(locale, 'never')

	return (
		<div>
			<DialogHeader>
				<DialogTitle>{t(locale, 'database')}</DialogTitle>
			</DialogHeader>

			<div className='mt-4 rounded-xl border border-border bg-muted p-3'>
				<div className='text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground'>
					{t(locale, 'database')}
				</div>
				<div className='mt-2 flex flex-wrap gap-2'>
					<Button variant='outline' onClick={onExport} ref={exportButtonRef}>
						{t(locale, 'exportDatabase')}
					</Button>
					<Button
						variant='outline'
						onClick={() => {
							if (!fileInputRef.current) return
							fileInputRef.current.value = ''
							fileInputRef.current.click()
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
				<div className='mt-3 space-y-2 text-sm text-muted-foreground'>
					<div className='flex items-center gap-2'>
						<span>{t(locale, 'databaseStatusLabel')}</span>
						<span className='font-medium text-foreground'>{syncStatusText}</span>
						<span
							aria-hidden='true'
							className={cn(
								'h-2.5 w-2.5 rounded-full',
								syncStatus === 'safe' ? 'bg-success' : 'bg-danger',
							)}
						/>
					</div>
					<p>{t(locale, 'lastBackupLabel', { date: lastExportLabel })}</p>
					<p>{syncStatusTooltip}</p>
					<p>{t(locale, 'databaseSafetyHint')}</p>
					<p>{t(locale, 'databaseOfflineHint')}</p>
				</div>
			</div>

			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onClose}>
					{t(locale, 'close')}
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

function ExternalLinkWarningDialog({
	locale,
	projectTitle,
	url,
	onCancel,
	onProceed,
	onTrustProject,
}: {
	locale: Locale
	projectTitle: string
	url: string
	onCancel: () => void
	onProceed: () => void
	onTrustProject: () => void
}) {
	return (
		<div>
			<DialogHeader>
				<DialogTitle className='flex items-center gap-2'>
					<ShieldAlert className='h-5 w-5 text-danger' />
					<span>{t(locale, 'externalLinkWarningTitle')}</span>
				</DialogTitle>
				<DialogDescription>
					{t(locale, 'externalLinkWarningDescription', { url })}
				</DialogDescription>
			</DialogHeader>
			<p className='mt-4 text-sm text-muted-foreground'>
				{t(locale, 'externalLinkWarningProjectHint', {
					name: projectTitle,
				})}
			</p>
			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onTrustProject}>
					{t(locale, 'makeProjectTrusted')}
				</Button>
				<Button variant='outline' onClick={onCancel}>
					{t(locale, 'cancel')}
				</Button>
				<Button onClick={onProceed}>{t(locale, 'goToSite')}</Button>
			</DialogFooter>
		</div>
	)
}

function TrustProjectDialog({
	locale,
	projectTitle,
	onCancel,
	onConfirm,
}: {
	locale: Locale
	projectTitle: string
	onCancel: () => void
	onConfirm: () => void
}) {
	const [confirmed, setConfirmed] = React.useState(false)
	const [delayComplete, setDelayComplete] = React.useState(false)

	React.useEffect(() => {
		setConfirmed(false)
		setDelayComplete(false)
		const handle = window.setTimeout(() => {
			setDelayComplete(true)
		}, 1800)
		return () => window.clearTimeout(handle)
	}, [projectTitle])

	return (
		<div>
			<DialogHeader>
				<DialogTitle>{t(locale, 'trustProjectTitle')}</DialogTitle>
				<DialogDescription>
					{t(locale, 'trustProjectDescription', { name: projectTitle })}
				</DialogDescription>
			</DialogHeader>
			<div className='mt-4 space-y-2 text-sm text-muted-foreground'>
				<p>{t(locale, 'trustProjectRiskNoWarnings')}</p>
				<p>{t(locale, 'trustProjectRiskTrustedAuthor')}</p>
				<p>{t(locale, 'trustProjectRiskIrreversible')}</p>
				<p>{t(locale, 'trustProjectQuestion')}</p>
			</div>
			<label className='mt-4 flex items-start gap-3 text-sm'>
				<Checkbox
					checked={confirmed}
					onCheckedChange={checked => setConfirmed(Boolean(checked))}
				/>
				<span>{t(locale, 'trustProjectCheckbox')}</span>
			</label>
			<DialogFooter className='mt-6'>
				<Button variant='outline' onClick={onCancel}>
					{t(locale, 'cancel')}
				</Button>
				<Button
					variant='destructive'
					disabled={!confirmed || !delayComplete}
					onClick={onConfirm}
				>
					{t(locale, 'confirmTrustProject')}
				</Button>
			</DialogFooter>
		</div>
	)
}
