// 我的衣柜页面
const uploadService = require('../../utils/upload.js')

Page({
  data: {
    // 服装列表
    clothingList: [],
    // 当前分类
    currentCategory: 'all',
    // 分类名称映射
    categoryNames: {
      all: '全部',
      top: '上衣',
      bottom: '下装',
      dress: '连衣裙',
      other: '其他'
    },
    // 加载状态
    loading: true
  },

  onLoad(options) {
    console.log('wardrobe.js onLoad: 衣柜页面加载')
    this.loadClothingList()
  },

  onShow() {
    // 每次显示页面时刷新列表
    this.loadClothingList()
  },

  /**
   * 加载服装列表
   */
  async loadClothingList() {
    try {
      this.setData({ loading: true })

      // 从本地存储加载服装列表
      const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []

      // 根据分类过滤
      const filteredList = this.data.currentCategory === 'all'
        ? clothingList
        : clothingList.filter(item => item.category === this.data.currentCategory)

      this.setData({
        clothingList: filteredList,
        loading: false
      })
    } catch (error) {
      console.error('加载服装列表失败:', error)
      this.setData({ loading: false })
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  /**
   * 切换分类
   */
  switchCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.loadClothingList()
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

      if (res.files && res.files.length > 0) {
        const file = res.files[0]

        // 弹出输入框，让用户输入服装名称和分类
        wx.showModal({
          title: '添加服装信息',
          editable: true,
          placeholderText: '请输入服装名称',
          success: (modalRes) => {
            if (modalRes.confirm) {
              const name = modalRes.content || '未命名服装'

              // 选择分类
              wx.showActionSheet({
                itemList: ['上衣', '下装', '连衣裙', '其他'],
                success: (actionRes) => {
                  const categories = ['top', 'bottom', 'dress', 'other']
                  const category = categories[actionRes.tapIndex]

                  // 保存到本地存储
                  this.saveClothing({
                    id: Date.now(),
                    name: name,
                    category: category,
                    url: file.url,
                    fileId: file.fileId,
                    createTime: new Date().toISOString()
                  })
                }
              })
            }
          }
        })
      }
    } catch (error) {
      if (error !== 'cancel') {
        console.error('添加服装失败:', error)
        wx.showToast({
          title: '添加失败',
          icon: 'error'
        })
      }
    }
  },

  /**
   * 保存服装到本地存储
   */
  saveClothing(clothing) {
    try {
      const clothingList = wx.getStorageSync('wardrobe_clothing_list') || []
      clothingList.unshift(clothing)
      wx.setStorageSync('wardrobe_clothing_list', clothingList)

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      })

      // 刷新列表
      this.loadClothingList()
    } catch (error) {
      console.error('保存服装失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
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
   * 使用服装（跳转到试衣间）
   */
  useClothing(e) {
    const item = e.currentTarget.dataset.item

    // 将选中的服装信息存储到全局数据
    getApp().globalData.selectedClothing = item

    wx.navigateTo({
      url: '/pages/fitting/fitting?fromWardrobe=true'
    })
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

            wx.showToast({
              title: '删除成功',
              icon: 'success'
            })

            // 刷新列表
            this.loadClothingList()
          } catch (error) {
            console.error('删除失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  }
})
