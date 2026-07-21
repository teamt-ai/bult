'use client'

import React, { useEffect, useState } from 'react'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabase'
import { 
  ArrowLeft, 
  Plus, 
  Trash2, 
  Edit3, 
  Save, 
  Info, 
  FileText, 
  LayoutGrid, 
  FolderPlus, 
  Package, 
  Check, 
  ChevronRight, 
  RefreshCw, 
  Sparkles, 
  AlertCircle,
  Clock,
  Undo
} from 'lucide-react'
import Link from 'next/link'

interface Item {
  id: string
  name: string
  image: string
  price: number
  discountType: 'none' | 'percent' | 'value'
  discountValue: number
  description: string
}

interface Category {
  id: string
  name: string
  subcategories: Category[]
  items: Item[]
}

interface CompanyInfoBlock {
  id: string
  title: string
  content: string
}

export default function VisualProfileBuilder({ params }: { params: { aiId: string } }) {
  const [ai, setAi] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'goods' | 'company'>('goods')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  // Database Row ID (for business_profile source)
  const [sourceRowId, setSourceRowId] = useState<string | null>(null)

  // Profile State
  const [goodsServices, setGoodsServices] = useState<Category[]>([])
  const [companyInfo, setCompanyInfo] = useState<CompanyInfoBlock[]>([])

  // Modal / Form States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [categoryModalParentId, setCategoryModalParentId] = useState<string | null>(null) // null = root level
  const [categoryModalName, setCategoryModalName] = useState('')
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)

  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [itemModalCategoryId, setItemModalCategoryId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  
  // Item Form Fields
  const [itemName, setItemName] = useState('')
  const [itemImage, setItemImage] = useState('')
  const [itemPrice, setItemPrice] = useState(0)
  const [itemDiscountType, setItemDiscountType] = useState<'none' | 'percent' | 'value'>('none')
  const [itemDiscountValue, setItemDiscountValue] = useState(0)
  const [itemDescription, setItemDescription] = useState('')

  // Company Info Form Fields
  const [companyBlockId, setCompanyBlockId] = useState<string | null>(null)
  const [companyBlockTitle, setCompanyBlockTitle] = useState('')
  const [companyBlockContent, setCompanyBlockContent] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/dashboard'
      return
    }

    // Fetch AI details
    const { data: aiData, error: aiError } = await supabase
      .from('business_ais')
      .select('*')
      .eq('id', params.aiId)
      .single()

    if (aiError || !aiData) {
      window.location.href = '/dashboard'
      return
    }
    setAi(aiData)

    // Fetch the business profile source
    const { data: sourceData } = await supabase
      .from('business_sources')
      .select('*')
      .eq('ai_id', params.aiId)
      .eq('category', 'business_profile')
      .single()

    if (sourceData) {
      setSourceRowId(sourceData.id)
      try {
        const parsed = JSON.parse(sourceData.content)
        setGoodsServices(parsed.goods_services || [])
        setCompanyInfo(parsed.company_info || [])
      } catch (e) {
        console.error('Error parsing business profile JSON:', e)
      }
    }
    setLoading(false)
  }

  // --- SAVE OPERATION ---
  const saveProfile = async (currentGoods: Category[], currentCompany: CompanyInfoBlock[]) => {
    setSaveStatus('saving')
    setErrorMessage('')

    const profilePayload = {
      goods_services: currentGoods,
      company_info: currentCompany
    }

    const jsonString = JSON.stringify(profilePayload)

    if (sourceRowId) {
      // Update
      const { error } = await supabase
        .from('business_sources')
        .update({
          content: jsonString,
          updated_at: new Date().toISOString()
        })
        .eq('id', sourceRowId)

      if (error) {
        setSaveStatus('error')
        setErrorMessage(error.message)
      } else {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } else {
      // Create
      const { data, error } = await supabase
        .from('business_sources')
        .insert({
          ai_id: params.aiId,
          category: 'business_profile',
          title: 'Business Profile',
          content: jsonString
        })
        .select()
        .single()

      if (error) {
        setSaveStatus('error')
        setErrorMessage(error.message)
      } else {
        if (data) setSourceRowId(data.id)
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    }
  }

  // Helper: Find Category recursively and run action
  const modifyCategoryInTree = (
    tree: Category[], 
    targetId: string, 
    action: (cat: Category) => void
  ): boolean => {
    for (let cat of tree) {
      if (cat.id === targetId) {
        action(cat)
        return true
      }
      if (cat.subcategories && cat.subcategories.length > 0) {
        const found = modifyCategoryInTree(cat.subcategories, targetId, action)
        if (found) return true
      }
    }
    return false
  }

  // Helper: Remove Category recursively
  const removeCategoryFromTree = (tree: Category[], targetId: string): Category[] => {
    return tree.filter(cat => {
      if (cat.id === targetId) return false
      if (cat.subcategories && cat.subcategories.length > 0) {
        cat.subcategories = removeCategoryFromTree(cat.subcategories, targetId)
      }
      return true
    })
  }

  // --- CATEGORY ACTIONS ---
  const handleOpenCategoryModal = (parentId: string | null = null, existingCat: Category | null = null) => {
    if (existingCat) {
      setEditingCategoryId(existingCat.id)
      setCategoryModalName(existingCat.name)
    } else {
      setEditingCategoryId(null)
      setCategoryModalName('')
    }
    setCategoryModalParentId(parentId)
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = () => {
    if (!categoryModalName.trim()) return

    const updatedGoods = [...goodsServices]

    if (editingCategoryId) {
      // Rename Category
      modifyCategoryInTree(updatedGoods, editingCategoryId, (cat) => {
        cat.name = categoryModalName.trim()
      })
    } else {
      // Create Category
      const newCat: Category = {
        id: 'cat_' + Math.random().toString(36).substring(2, 9),
        name: categoryModalName.trim(),
        subcategories: [],
        items: []
      }

      if (categoryModalParentId === null) {
        updatedGoods.push(newCat)
      } else {
        modifyCategoryInTree(updatedGoods, categoryModalParentId, (parent) => {
          parent.subcategories.push(newCat)
        })
      }
    }

    setGoodsServices(updatedGoods)
    setIsCategoryModalOpen(false)
    setCategoryModalName('')
    saveProfile(updatedGoods, companyInfo)
  }

  const handleDeleteCategory = (catId: string) => {
    if (!confirm('Are you sure you want to delete this category? All subcategories and products inside it will also be deleted.')) return
    const updatedGoods = removeCategoryFromTree([...goodsServices], catId)
    setGoodsServices(updatedGoods)
    saveProfile(updatedGoods, companyInfo)
  }

  // --- ITEM ACTIONS ---
  const handleOpenItemModal = (catId: string, existingItem: Item | null = null) => {
    setItemModalCategoryId(catId)
    if (existingItem) {
      setEditingItemId(existingItem.id)
      setItemName(existingItem.name)
      setItemImage(existingItem.image)
      setItemPrice(existingItem.price)
      setItemDiscountType(existingItem.discountType)
      setItemDiscountValue(existingItem.discountValue)
      setItemDescription(existingItem.description)
    } else {
      setEditingItemId(null)
      setItemName('')
      setItemImage('')
      setItemPrice(0)
      setItemDiscountType('none')
      setItemDiscountValue(0)
      setItemDescription('')
    }
    setIsItemModalOpen(true)
  }

  const handleSaveItem = () => {
    if (!itemName.trim() || !itemModalCategoryId) return

    const updatedGoods = [...goodsServices]

    const itemData: Item = {
      id: editingItemId || 'item_' + Math.random().toString(36).substring(2, 9),
      name: itemName.trim(),
      image: itemImage.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop',
      price: Number(itemPrice),
      discountType: itemDiscountType,
      discountValue: itemDiscountType === 'none' ? 0 : Number(itemDiscountValue),
      description: itemDescription.trim()
    }

    modifyCategoryInTree(updatedGoods, itemModalCategoryId, (parent) => {
      if (editingItemId) {
        // Edit item
        parent.items = parent.items.map(item => item.id === editingItemId ? itemData : item)
      } else {
        // Add new item
        parent.items.push(itemData)
      }
    })

    setGoodsServices(updatedGoods)
    setIsItemModalOpen(false)
    saveProfile(updatedGoods, companyInfo)
  }

  const handleDeleteItem = (catId: string, itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    const updatedGoods = [...goodsServices]
    modifyCategoryInTree(updatedGoods, catId, (parent) => {
      parent.items = parent.items.filter(item => item.id !== itemId)
    })
    setGoodsServices(updatedGoods)
    saveProfile(updatedGoods, companyInfo)
  }

  // --- COMPANY INFO ACTIONS ---
  const handleSaveCompanyBlock = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyBlockTitle.trim() || !companyBlockContent.trim()) return

    let updatedCompany = [...companyInfo]

    if (companyBlockId) {
      // Edit
      updatedCompany = updatedCompany.map(block => 
        block.id === companyBlockId 
          ? { ...block, title: companyBlockTitle.trim(), content: companyBlockContent.trim() }
          : block
      )
      setCompanyBlockId(null)
    } else {
      // Create
      const newBlock: CompanyInfoBlock = {
        id: 'info_' + Math.random().toString(36).substring(2, 9),
        title: companyBlockTitle.trim(),
        content: companyBlockContent.trim()
      }
      updatedCompany.push(newBlock)
    }

    setCompanyInfo(updatedCompany)
    setCompanyBlockTitle('')
    setCompanyBlockContent('')
    saveProfile(goodsServices, updatedCompany)
  }

  const handleEditCompanyBlock = (block: CompanyInfoBlock) => {
    setCompanyBlockId(block.id)
    setCompanyBlockTitle(block.title)
    setCompanyBlockContent(block.content)
  }

  const handleDeleteCompanyBlock = (id: string) => {
    if (!confirm('Are you sure you want to delete this company information block?')) return
    const updatedCompany = companyInfo.filter(b => b.id !== id)
    setCompanyInfo(updatedCompany)
    saveProfile(goodsServices, updatedCompany)
  }

  const handleAddPreset = (title: string, placeholder: string) => {
    setCompanyBlockId(null)
    setCompanyBlockTitle(title)
    setCompanyBlockContent(placeholder)
  }

  // --- RECURSIVE TREE RENDER ---
  const renderCategoryTree = (category: Category, depth: number = 0) => {
    const hasSubcats = category.subcategories && category.subcategories.length > 0
    const hasItems = category.items && category.items.length > 0
    const isEmpty = !hasSubcats && !hasItems

    return (
      <div 
        key={category.id} 
        className="border rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-900/20 mb-4 transition hover:border-slate-300 dark:hover:border-slate-800"
        style={{ marginLeft: `${depth * 1.5}rem` }}
      >
        {/* Category Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap border-b pb-3 mb-3">
          <div className="flex items-center space-x-2">
            <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
            <h4 className="font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 text-base md:text-lg">
              <span>{category.name}</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-400 font-semibold tracking-wider uppercase font-mono">
                {isEmpty ? 'Empty' : hasSubcats ? 'Branch' : 'Items'}
              </span>
            </h4>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleOpenCategoryModal(null, category)}
              className="p-1.5 text-slate-500 hover:text-primary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Rename Category"
            >
              <Edit3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => handleDeleteCategory(category.id)}
              className="p-1.5 text-slate-500 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
              title="Delete Category"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content Node - Subcategories OR Items OR Actions if Empty */}
        <div className="space-y-4">
          {/* 1. Branch Category: Contains Subcategories */}
          {hasSubcats && (
            <div className="space-y-3">
              {category.subcategories.map(sub => renderCategoryTree(sub, depth + 1))}
              <div className="flex items-center" style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}>
                <button
                  onClick={() => handleOpenCategoryModal(category.id)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition text-slate-600 dark:text-slate-300"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Add Subcategory under {category.name}</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Leaf Category: Contains Products / Services */}
          {hasItems && (
            <div className="grid sm:grid-cols-2 gap-4">
              {category.items.map(item => {
                const finalPrice = item.discountType === 'percent' 
                  ? item.price * (1 - item.discountValue / 100)
                  : item.discountType === 'value'
                    ? Math.max(0, item.price - item.discountValue)
                    : item.price

                return (
                  <div 
                    key={item.id} 
                    className="flex gap-4 p-3 bg-white dark:bg-slate-950 border rounded-2xl shadow-sm relative overflow-hidden"
                  >
                    {item.image && (
                      <img 
                        src={item.image} 
                        alt={item.name} 
                        className="w-20 h-20 rounded-xl object-cover shrink-0 border"
                      />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-white truncate pr-14">
                          {item.name}
                        </h5>
                        <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                          {item.description || 'No description provided.'}
                        </p>
                      </div>

                      <div className="mt-2 flex items-baseline gap-2">
                        <span className="font-extrabold text-sm text-primary">
                          ${finalPrice.toFixed(2)}
                        </span>
                        {item.discountType !== 'none' && (
                          <>
                            <span className="text-xs line-through text-slate-400">
                              ${item.price.toFixed(2)}
                            </span>
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-wide">
                              {item.discountType === 'percent' ? `${item.discountValue}% Off` : `$${item.discountValue} Off`}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Action buttons floating top-right */}
                    <div className="absolute top-2 right-2 flex space-x-1">
                      <button
                        onClick={() => handleOpenItemModal(category.id, item)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 border text-slate-500 hover:text-primary rounded-lg transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteItem(category.id, item.id)}
                        className="p-1.5 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 border text-slate-500 hover:text-red-500 rounded-lg transition"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )
              })}
              <div className="sm:col-span-2">
                <button
                  onClick={() => handleOpenItemModal(category.id)}
                  className="inline-flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition text-slate-600 dark:text-slate-300"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Add Goods or Service inside {category.name}</span>
                </button>
              </div>
            </div>
          )}

          {/* 3. Empty Category: Can choose to hold Subcategories OR Goods & Services */}
          {isEmpty && (
            <div className="flex flex-col sm:flex-row gap-2 py-4 justify-center items-center border border-dashed rounded-2xl bg-white dark:bg-slate-950/30">
              <span className="text-xs text-slate-400 font-medium mb-2 sm:mb-0 mr-2">Choose what {category.name} will contain:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenCategoryModal(category.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-primary transition"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  <span>Subcategories</span>
                </button>
                <span className="text-slate-300 dark:text-slate-800 self-center">or</span>
                <button
                  onClick={() => handleOpenItemModal(category.id)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-bold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-emerald-500 transition"
                >
                  <Package className="h-3.5 w-3.5" />
                  <span>Goods & Services</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen grid-bg flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <RefreshCw className="h-8 w-8 text-primary animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen grid-bg flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center space-x-1.5 text-sm font-semibold hover:text-primary transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">
              Build Business Profile: <span className="gradient-text">{ai?.name}</span>
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Add products, services, opening hours, terms, and refund guidelines to program your AI assistant.
            </p>
          </div>

          {/* Save Status Badge */}
          <div className="flex items-center space-x-2 shrink-0">
            {saveStatus === 'saving' && (
              <span className="text-xs flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider">
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                <span>Auto-saving...</span>
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-xs flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-green-500/20 bg-green-500/5 text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">
                <Check className="h-3.5 w-3.5" />
                <span>Saved successfully</span>
              </span>
            )}
            {saveStatus === 'error' && (
              <span className="text-xs flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-red-500/20 bg-red-500/5 text-red-600 dark:text-red-400 font-bold uppercase tracking-wider">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Save Error</span>
              </span>
            )}
          </div>
        </div>

        {/* Tabs and Forms Panel */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Main Visual Profile Configurator */}
          <div className="lg:col-span-12">
            {/* Tab buttons */}
            <div className="flex border-b mb-6 space-x-6">
              <button
                onClick={() => setActiveTab('goods')}
                className={`pb-3 font-extrabold text-sm md:text-base border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'goods'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <LayoutGrid className="h-4.5 w-4.5" />
                <span>Goods & Services</span>
              </button>
              <button
                onClick={() => setActiveTab('company')}
                className={`pb-3 font-extrabold text-sm md:text-base border-b-2 transition flex items-center space-x-2 ${
                  activeTab === 'company'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <FileText className="h-4.5 w-4.5" />
                <span>Company Information</span>
              </button>
            </div>

            {/* TAB 1: GOODS & SERVICES */}
            {activeTab === 'goods' && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-6 flex-wrap gap-4 border-b pb-4">
                    <div>
                      <h3 className="text-xl font-bold">Catalog Category Tree</h3>
                      <p className="text-xs text-slate-400 mt-1">
                        Build your categories hierarchy. Categories can hold subcategories OR goods/services, but not both at once.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenCategoryModal(null)}
                      className="inline-flex items-center justify-center space-x-1.5 px-4 py-2 text-sm font-bold gradient-btn rounded-xl"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Add Top-Level Category</span>
                    </button>
                  </div>

                  {errorMessage && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/25 text-red-500 rounded-xl text-xs flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {goodsServices.length === 0 ? (
                    <div className="text-center py-16">
                      <FolderPlus className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300">Catalog is empty</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        Get started by adding a top-level category like "Beverages", "Computers", or "Consultation Services".
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {goodsServices.map(cat => renderCategoryTree(cat, 0))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: COMPANY INFORMATION */}
            {activeTab === 'company' && (
              <div className="grid lg:grid-cols-12 gap-8">
                {/* Editor Block Form */}
                <div className="lg:col-span-5">
                  <div className="bg-white dark:bg-slate-950 border rounded-3xl p-6 shadow-sm sticky top-24">
                    <h3 className="text-xl font-bold mb-4">
                      {companyBlockId ? 'Edit Info Block' : 'Add New Info Block'}
                    </h3>

                    {/* Preset buttons */}
                    {!companyBlockId && (
                      <div className="mb-6">
                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Preset Quick Titles</span>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddPreset('Opening Hours', 'Monday - Friday: 9 AM - 6 PM\nSaturday: 10 AM - 4 PM\nSunday: Closed')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition font-medium text-slate-600 dark:text-slate-400"
                          >
                            <Clock className="h-3 w-3" />
                            <span>Opening Hours</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPreset('Refund Policy', 'We offer full refunds within 14 days of purchase. Items must be unused and in original packaging.')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition font-medium text-slate-600 dark:text-slate-400"
                          >
                            <Undo className="h-3.5 w-3.5" />
                            <span>Refund Policy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAddPreset('Terms & Conditions', 'By ordering, customers agree to our service terms. Deliveries take 3-5 business days.')}
                            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900 transition font-medium text-slate-600 dark:text-slate-400"
                          >
                            <FileText className="h-3 w-3" />
                            <span>Terms</span>
                          </button>
                        </div>
                      </div>
                    )}

                    <form onSubmit={handleSaveCompanyBlock} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Block Title</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Delivery Guidelines, Holiday Schedule"
                          value={companyBlockTitle}
                          onChange={(e) => setCompanyBlockTitle(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Block Content</label>
                        <textarea
                          rows={6}
                          required
                          placeholder="Input details about your company here. You can paste bullet lists, address info, or support guidelines."
                          value={companyBlockContent}
                          onChange={(e) => setCompanyBlockContent(e.target.value)}
                          className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                        />
                      </div>

                      <div className="flex space-x-2 pt-2">
                        {companyBlockId && (
                          <button
                            type="button"
                            onClick={() => {
                              setCompanyBlockId(null)
                              setCompanyBlockTitle('')
                              setCompanyBlockContent('')
                            }}
                            className="flex-1 py-2.5 border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition text-sm"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="submit"
                          className="flex-1 py-2.5 rounded-xl font-bold gradient-btn flex items-center justify-center space-x-1.5 text-sm"
                        >
                          <Save className="h-4 w-4" />
                          <span>{companyBlockId ? 'Save Block' : 'Add Block'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                </div>

                {/* List of active blocks */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xl font-bold flex items-center space-x-2">
                    <span>Company Information Blocks</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full border bg-slate-100 dark:bg-slate-800 text-slate-500 font-semibold">
                      {companyInfo.length} total
                    </span>
                  </h3>

                  {companyInfo.length === 0 ? (
                    <div className="text-center py-16 bg-white dark:bg-slate-950 rounded-3xl border p-8 shadow-sm">
                      <Info className="h-8 w-8 text-slate-300 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-700 dark:text-slate-300">No Information Blocks Added</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                        Add text blocks on the left to write about your refund policies, business hours, contacts, etc.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {companyInfo.map(block => (
                        <div 
                          key={block.id}
                          className="bg-white dark:bg-slate-950 border rounded-3xl p-5 shadow-sm flex items-start justify-between gap-4"
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="text-lg font-bold text-slate-900 dark:text-white truncate">
                              {block.title}
                            </h4>
                            <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 whitespace-pre-wrap leading-relaxed">
                              {block.content}
                            </p>
                          </div>
                          
                          <div className="flex items-center space-x-1 shrink-0">
                            <button
                              onClick={() => handleEditCompanyBlock(block)}
                              className="p-2 text-slate-500 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg border transition"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCompanyBlock(block.id)}
                              className="p-2 text-slate-500 hover:text-red-500 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-lg border transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* --- DIALOG MODALS --- */}

      {/* 1. Category Modal (Create / Rename) */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-950 border max-w-md w-full rounded-3xl p-6 shadow-2xl relative">
            <h3 className="text-xl font-bold mb-2">
              {editingCategoryId ? 'Rename Category' : 'Create Category'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              {categoryModalParentId 
                ? 'Create a nested subcategory under the parent category.' 
                : 'Create a main category at the root level of your catalog.'}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hot Drinks, Desserts, Laptops"
                  value={categoryModalName}
                  onChange={(e) => setCategoryModalName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCategory}
                  className="flex-1 py-2.5 rounded-xl font-bold gradient-btn text-sm"
                >
                  Save Category
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Item Modal (Create / Edit product/service) */}
      {isItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-950 border max-w-lg w-full rounded-3xl p-6 md:p-8 shadow-2xl relative my-8">
            <h3 className="text-xl font-bold mb-2">
              {editingItemId ? 'Edit Product or Service' : 'Add Product or Service'}
            </h3>
            <p className="text-xs text-slate-400 mb-6">
              Enter the parameters of the goods or service for the AI model to know.
            </p>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lavender Macchiato, Hair Trim"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Image URL</label>
                <input
                  type="text"
                  placeholder="https://example.com/item.png"
                  value={itemImage}
                  onChange={(e) => setItemImage(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={() => setItemImage('https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&auto=format&fit=crop')}
                  className="text-[10px] mt-1 text-primary hover:underline font-semibold"
                >
                  Use Mock Placeholder Image
                </button>
              </div>

              {/* Price & Discount */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={itemPrice}
                    onChange={(e) => setItemPrice(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Discount Type</label>
                  <select
                    value={itemDiscountType}
                    onChange={(e) => setItemDiscountType(e.target.value as any)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="none">No Discount</option>
                    <option value="percent">Percentage (%)</option>
                    <option value="value">Fixed Amount ($)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="0"
                    disabled={itemDiscountType === 'none'}
                    value={itemDiscountValue}
                    onChange={(e) => setItemDiscountValue(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Description</label>
                <textarea
                  rows={4}
                  placeholder="Detailed description of the goods or service (e.g. ingredients, session duration, size details)."
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Buttons */}
              <div className="flex space-x-3 pt-4 border-t">
                <button
                  onClick={() => setIsItemModalOpen(false)}
                  className="flex-1 py-2.5 border rounded-xl font-bold hover:bg-slate-50 dark:hover:bg-slate-900 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveItem}
                  className="flex-1 py-2.5 rounded-xl font-bold gradient-btn text-sm"
                >
                  Save Product/Service
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
