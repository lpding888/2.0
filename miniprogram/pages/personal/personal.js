// 玩美空间入口页面
Page({
  data: {},

  onLoad(options) {
    console.log('personal.js onLoad: 玩美空间页面加载')
  },

  /**
   * 前往试衣间
   */
  goToFitting() {
    wx.navigateTo({
      url: '/pages/fitting/fitting'
    })
  },

  /**
   * 前往衣柜
   */
  goToWardrobe() {
    wx.navigateTo({
      url: '/pages/wardrobe/wardrobe'
    })
  },

  /**
   * 前往全球旅行
   */
  goToTravel() {
    wx.navigateTo({
      url: '/pages/travel/travel'
    })
  }
})
