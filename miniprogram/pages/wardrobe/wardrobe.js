// 我的衣柜页面
const uploadService = require('../../utils/upload.js')

Page({
  data: {
    // 视图模式：clothing(服装) / outfit(套装)
    viewMode: 'clothing',

    // 服装列表
    clothingList: [],
    allClothingList: [], // 完整列表（用于搜索）
    outfitList: [], // 套装列表

    // 筛选条件
    currentCategory: 'all',
    currentSeason: 'all',
    sortType: 'recent', // recent(最近添加) / frequent(使用频率) / name(名称)
    searchKeyword: '',

    // 分类和季节选项
    categories: [
      { key: 'all', label: '全部', icon: '👔' },
      { key: 'top', label: '上衣', icon: '👕' },
      { key: 'bottom', label: '下装', icon: '👖' },
      { key: 'shoes', label: '鞋子', icon: '👟' },
      { key: 'other', label: '其他', icon: '🎒' }
    ],

    seasons: [
      { key: 'all', label: '全季', icon: '🌈' },
      { key: 'spring', label: '春', icon: '🌸' },
      { key: 'summer', label: '夏', icon: '☀️' },
      { key: 'autumn', label: '秋', icon: '🍂' },
      { key: 'winter', label: '冬', icon: '❄️' }
    ],

    // 颜色选项
    colors: [
      { key: 'black', label: '黑色', hex: '#000000' },
      { key: 'white', label: '白色', hex: '#FFFFFF' },
      { key: 'red', label: '红色', hex: '#FF0000' },
      { key: 'blue', label: '蓝色', hex: '#0066FF' },
      { key: 'green', label: '绿色', hex: '#00CC66' },
      { key: 'yellow', label: '黄色', hex: '#FFD700' },
      { key: 'pink', label: '粉色', hex: '#FF69B4' },
      { key: 'gray', label: '灰色', hex: '#808080' },
      { key: 'brown', label: '棕色', hex: '#8B4513' },
      { key: 'purple', label: '紫色', hex: '#9370DB' }
    ],

    // 加载状态
    loading: true,

    // 弹窗状态
    showSortMenu: false,
    showOutfitModal: false,
    selectedClothingForOutfit: [], // 创建套装时选中的服装
    clothingListForOutfit: [] // 用于套装选择的服装列表（带isSelected标记）
  },

  onLoad(options) {
    console.log('wardrobe.js onLoad: 衣柜页面加载')
    this.loadData()
  },

  onShow() {
    // 每次显示页面时刷新列表
    this.loadData()
  },

  /**
   * 加载数据
   */
  async loadData() {
    try {
      this.setData({ loading: true })

      if (this.data.viewMode === 'clothing') {
        await this.loadClothingList()
      } else {
        await this.loadOutfitList()
      }
    } finally {
      this.setData({ loading: false })
    }
  },

  /**
   * 加载服装列表
   */
  async loadClothingList() {
    try {
      // 从本地存储加载服装列表
      let clothingList = wx.getStorageSync('wardrobe_clothing_list') || []

      // 只显示type为clothing的（排除套装中的虚拟item）
      clothingList = clothingList.filter(item => !item.type || item.type === 'clothing')

      // 保存完整列表
      this.setData({ allClothingList: clothingList })

      // 应用筛选
      this.applyFilters(clothingList)
    } catch (error) {
      console.error('加载服装列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
    }
  },

  /**
   * 加载套装列表
   */
  async loadOutfitList() {
    try {
      const outfitList = wx.getStorageSync('wardrobe_outfit_list') || []
      this.setData({ outfitList })
    } catch (error) {
      console.error('加载套装列表失败:', error)
      wx.showToast({ title: '加载失败', icon: 'error' })
    }
  },

  /**
   * 应用筛选和排序
   */
  applyFilters(list) {
    let filteredList = [...list]

    // 搜索关键词
    if (this.data.searchKeyword.trim()) {
      const keyword = this.data.searchKeyword.trim().toLowerCase()
      filteredList = filteredList.filter(item => {
        return (item.name && item.name.toLowerCase().includes(keyword)) ||
               (item.note && item.note.toLowerCase().includes(keyword)) ||
               (item.color && item.color.toLowerCase().includes(keyword))
      })
    }

    // 分类筛选
    if (this.data.currentCategory !== 'all') {
      filteredList = filteredList.filter(item => item.category === this.data.currentCategory)
    }

    // 季节筛选
    if (this.data.currentSeason !== 'all') {
      filteredList = filteredList.filter(item => {
        if (!item.seasons || item.seasons.length === 0) return false
        return item.seasons.includes(this.data.currentSeason) ||
               item.seasons.includes('all-season')
      })
    }

    // 排序
    switch (this.data.sortType) {
      case 'recent':
        // 最近添加（默认）
        filteredList.sort((a, b) => {
          return new Date(b.createTime || 0) - new Date(a.createTime || 0)
        })
        break
      case 'frequent':
        // 使用频率
        filteredList.sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
        break
      case 'name':
        // 名称排序
        filteredList.sort((a, b) => {
          return (a.name || '').localeCompare(b.name || '', 'zh-CN')
        })
        break
      case 'favorite':
        // 常穿优先
        filteredList.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1
          if (!a.isFavorite && b.isFavorite) return 1
          return new Date(b.createTime || 0) - new Date(a.createTime || 0)
        })
        break
    }

    this.setData({ clothingList: filteredList })
  },

  /**
   * 切换视图模式
   */
  switchViewMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ viewMode: mode })
    this.loadData()
  },

  /**
   * 搜索输入
   */
  onSearchInput(e) {
    this.setData({ searchKeyword: e.detail.value })
    this.applyFilters(this.data.allClothingList)
  },

  /**
   * 清空搜索
   */
  clearSearch() {
    this.setData({ searchKeyword: '' })
    this.applyFilters(this.data.allClothingList)
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.applyFilters(this.data.allClothingList)
  },

  /**
   * 切换季节
   */
  switchSeason(e) {
    const season = e.currentTarget.dataset.season
    this.setData({ currentSeason: season })
    this.applyFilters(this.data.allClothingList)
  },

  /**
   * 显示排序菜单
   */
  showSortMenu() {
    this.setData({ showSortMenu: true })
  },

  /**
   * 隐藏排序菜单
   */
  hideSortMenu() {
    this.setData({ showSortMenu: false })
  },

  /**
   * 切换排序方式
   */
  switchSort(e) {
    const sortType = e.currentTarget.dataset.sort
    this.setData({
      sortType,
      showSortMenu: false
    })
    this.applyFilters(this.data.allClothingList)
  },

  /**
   * 添加服装
   */
  async addClothing() {
    try {
      // 选择并上传服装图片
      const res = await uploadService.chooseAndUploadImage({
        count: 1,
        fileType: 'clothing',
        base64Mode: true
      })

      if (res.success && res.data.uploaded && res.data.uploaded.length > 0) {
        const file = res.data.uploaded[0]

        // 弹出详细信息输入
        this.showAddClothingModal(file)
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('添加服装失败:', error)
        wx.showToast({ title: '上传失败', icon: 'error' })
      }
    }
  },

  /**
   * 显示添加服装详细信息弹窗
   */
  showAddClothingModal(file) {
    // 输入名称
    wx.showModal({
      title: '服装名称',
      editable: true,
      placeholderText: '如：白色衬衫',
      success: (nameRes) => {
        if (nameRes.confirm) {
          const name = nameRes.content || '未命名服装'

          // 选择分类
          wx.showActionSheet({
            itemList: ['上衣', '下装', '鞋子', '其他'],
            success: (categoryRes) => {
              const categories = ['top', 'bottom', 'shoes', 'other']
              const category = categories[categoryRes.tapIndex]

              // 选择季节
              this.selectSeasons((seasons) => {
                // 选择颜色
                this.selectColor((color) => {
                  // 保存服装
                  this.saveClothing({
                    id: Date.now(),
                    type: 'clothing',
                    name: name,
                    category: category,
                    seasons: seasons,
                    color: color,
                    url: file.fileId,
                    fileId: file.fileId,
                    useCount: 0,
                    isFavorite: false,
                    note: '',
                    createTime: new Date().toISOString()
                  })
                })
              })
            }
          })
        }
      }
    })
  },

  /**
   * 选择季节（多选）
   */
  selectSeasons(callback) {
    const that = this
    const tempSelectedSeasons = []

    // 创建临时页面用于多选
    wx.showActionSheet({
      itemList: ['春季🌸', '夏季☀️', '秋季🍂', '冬季❄️', '四季通用🌈'],
      success: (res) => {
        const seasonKeys = ['spring', 'summer', 'autumn', 'winter', 'all-season']
        callback([seasonKeys[res.tapIndex]])
      },
      fail: () => {
        callback(['all-season']) // 默认四季通用
      }
    })
  },

  /**
   * 选择颜色
   */
  selectColor(callback) {
    wx.showActionSheet({
      itemList: ['黑色', '白色', '红色', '蓝色', '绿色', '黄色', '粉色', '灰色', '棕色', '紫色'],
      success: (res) => {
        const colorKeys = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'pink', 'gray', 'brown', 'purple']
        callback(colorKeys[res.tapIndex])
      },
      fail: () => {
        callback('') // 不选择颜色
      }
    })
  },

  /**
   * 保存服装到本地存储
   */
  saveClothing(clothing) {
    try {
      const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
      clothingList.unshift(clothing)
      wx.setStorageSync('wardrobe_clothing_list', clothingList)

      wx.showToast({ title: '添加成功', icon: 'success' })

      // 刷新列表
      this.loadClothingList()
    } catch (error) {
      console.error('保存服装失败:', error)
      wx.showToast({ title: '保存失败', icon: 'error' })
    }
  },

  /**
   * 查看服装详情
   */
  viewClothing(e) {
    const item = e.currentTarget.dataset.item
    wx.previewImage({
      current: item.url,
      urls: [item.url]
    })
  },

  /**
   * 长按服装卡片
   */
  onClothingLongPress(e) {
    const item = e.currentTarget.dataset.item
    const itemList = [
      item.isFavorite ? '取消常穿' : '设为常穿',
      '编辑信息',
      '删除'
    ]

    wx.showActionSheet({
      itemList,
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.toggleFavorite(item)
            break
          case 1:
            this.editClothing(item)
            break
          case 2:
            this.deleteClothing({ currentTarget: { dataset: { id: item.id } } })
            break
        }
      }
    })
  },

  /**
   * 切换常穿标记
   */
  toggleFavorite(item) {
    try {
      const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
      const index = clothingList.findIndex(c => c.id === item.id)

      if (index > -1) {
        clothingList[index].isFavorite = !clothingList[index].isFavorite
        wx.setStorageSync('wardrobe_clothing_list', clothingList)

        wx.showToast({
          title: clothingList[index].isFavorite ? '已设为常穿' : '已取消常穿',
          icon: 'success'
        })

        this.loadClothingList()
      }
    } catch (error) {
      console.error('切换常穿失败:', error)
      wx.showToast({ title: '操作失败', icon: 'error' })
    }
  },

  /**
   * 编辑服装信息
   */
  editClothing(item) {
    wx.showModal({
      title: '编辑服装名称',
      editable: true,
      placeholderText: item.name,
      success: (res) => {
        if (res.confirm && res.content) {
          try {
            const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
            const index = clothingList.findIndex(c => c.id === item.id)

            if (index > -1) {
              clothingList[index].name = res.content
              wx.setStorageSync('wardrobe_clothing_list', clothingList)
              wx.showToast({ title: '修改成功', icon: 'success' })
              this.loadClothingList()
            }
          } catch (error) {
            console.error('编辑失败:', error)
            wx.showToast({ title: '修改失败', icon: 'error' })
          }
        }
      }
    })
  },

  /**
   * 使用服装（跳转到试衣间）
   */
  useClothing(e) {
    const item = e.currentTarget.dataset.item

    // 增加使用次数
    this.incrementUseCount(item.id)

    // 将选中的服装信息存储到全局数据
    getApp().globalData.selectedClothing = item

    wx.navigateTo({
      url: '/pages/fitting-personal/fitting-personal?fromWardrobe=true'
    })
  },

  /**
   * 增加使用次数
   */
  incrementUseCount(id) {
    try {
      const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
      const index = clothingList.findIndex(c => c.id === id)

      if (index > -1) {
        clothingList[index].useCount = (clothingList[index].useCount || 0) + 1
        clothingList[index].lastUsedTime = new Date().toISOString()
        wx.setStorageSync('wardrobe_clothing_list', clothingList)
      }
    } catch (error) {
      console.error('更新使用次数失败:', error)
    }
  },

  /**
   * 删除服装
   */
  deleteClothing(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件服装吗？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          try {
            const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
            const newList = clothingList.filter(item => item.id !== id)
            wx.setStorageSync('wardrobe_clothing_list', newList)

            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadClothingList()
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  },

  /**
   * 创建套装
   */
  createOutfit() {
    // 为每个服装添加isSelected标记
    const clothingListWithSelection = this.data.allClothingList.map(item => ({
      ...item,
      isSelected: false
    }))

    this.setData({
      showOutfitModal: true,
      selectedClothingForOutfit: [],
      clothingListForOutfit: clothingListWithSelection
    })
  },

  /**
   * 关闭套装创建弹窗
   */
  closeOutfitModal() {
    this.setData({ showOutfitModal: false })
  },

  /**
   * 选择服装加入套装
   */
  toggleClothingForOutfit(e) {
    const item = e.currentTarget.dataset.item
    const index = e.currentTarget.dataset.index
    let selected = [...this.data.selectedClothingForOutfit]

    const selectedIndex = selected.findIndex(s => s.id === item.id)
    if (selectedIndex > -1) {
      selected.splice(selectedIndex, 1)
    } else {
      selected.push(item)
    }

    // 更新列表中的isSelected状态
    this.setData({
      selectedClothingForOutfit: selected,
      [`clothingListForOutfit[${index}].isSelected`]: selectedIndex === -1
    })
  },

  /**
   * 保存套装
   */
  saveOutfit() {
    if (this.data.selectedClothingForOutfit.length === 0) {
      wx.showToast({ title: '请至少选择一件服装', icon: 'none' })
      return
    }

    wx.showModal({
      title: '套装名称',
      editable: true,
      placeholderText: '如：约会穿搭',
      success: (res) => {
        if (res.confirm) {
          const name = res.content || '未命名套装'

          try {
            const outfit = {
              id: Date.now(),
              name: name,
              items: this.data.selectedClothingForOutfit,
              useCount: 0,
              createTime: new Date().toISOString()
            }

            const outfitList = wx.getStorageSync('wardrobe_outfit_list') || []
            outfitList.unshift(outfit)
            wx.setStorageSync('wardrobe_outfit_list', outfitList)

            wx.showToast({ title: '套装创建成功', icon: 'success' })

            this.setData({
              showOutfitModal: false,
              selectedClothingForOutfit: []
            })
          } catch (error) {
            console.error('保存套装失败:', error)
            wx.showToast({ title: '保存失败', icon: 'error' })
          }
        }
      }
    })
  },

  /**
   * 使用套装
   */
  useOutfit(e) {
    const outfit = e.currentTarget.dataset.outfit

    // 增加使用次数
    try {
      const outfitList = wx.getStorageSync('wardrobe_outfit_list') || []
      const index = outfitList.findIndex(o => o.id === outfit.id)

      if (index > -1) {
        outfitList[index].useCount = (outfitList[index].useCount || 0) + 1
        wx.setStorageSync('wardrobe_outfit_list', outfitList)
      }
    } catch (error) {
      console.error('更新套装使用次数失败:', error)
    }

    // 跳转到试衣间，传递套装信息
    wx.navigateTo({
      url: '/pages/fitting-personal/fitting-personal?outfitId=' + outfit.id
    })
  },

  /**
   * 删除套装
   */
  deleteOutfit(e) {
    const id = e.currentTarget.dataset.id

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个套装吗？',
      confirmColor: '#e74c3c',
      success: (res) => {
        if (res.confirm) {
          try {
            const outfitList = wx.getStorageSync('wardrobe_outfit_list') || []
            const newList = outfitList.filter(item => item.id !== id)
            wx.setStorageSync('wardrobe_outfit_list', newList)

            wx.showToast({ title: '删除成功', icon: 'success' })
            this.loadOutfitList()
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({ title: '删除失败', icon: 'error' })
          }
        }
      }
    })
  }
})
