var app = {
    /**
     * ajax
     * @param url
     * @param data
     * @param success
     * @param error
     */
    ajax: function (url, data, success, error) {
      var loading = $('#loading-container');
      $.ajax({
        url: url,
        type: 'post',
        data: data,
        dataType: 'json',
        beforeSend: function () {
          loading.fadeIn(200);
        },
        success: success,
        error: error,
        complete: function () {
          loading.fadeOut(50);
        }
      });
    },
    /**
     * 鎵ц璇锋眰
     * @param url       璇锋眰鍦板潃
     * @param data      鏁版嵁
     * @param success   鍚庣杩斿洖鎴愬姛鍚庢墽琛岀殑鍥炶皟
     * @param error     鍚庣杩斿洖澶辫触鍚庢墽琛岀殑鍥炶皟
     * @returns {*|void}
     */
    request: function (url, data, success, error) {
      return app.ajax(url, data, function (response) {
        mdui.snackbar({
          message: "<i class=\"mdui-icon material-icons\">" + (response.code ? '&#xe86c' : '&#xe000') + ";</i> " + response.msg,
          position: 'right-top',
          timeout: response.code ? 1000 : 2000,
          onClose: function () {
            if (response.code) {
              success && success();
            } else {
              error && error();
            }
          }
        });
      });
    },
    /**
     * Msg
     * @param bool
     * @param msg
     * @param callback
     */
    msg: function (bool, msg, callback) {
      mdui.snackbar({
        message: "<i class=\"mdui-icon material-icons\">" + (bool ? '&#xe86c' : '&#xe000') + ";</i> " + msg,
        position: 'right-top',
        timeout: bool ? 1000 : 2000,
        onClose: function () {
          if (bool) callback && callback();
        }
      });
    },
    cookie: {
      /**
       * 璁剧疆cookie
       * @param key   cookie鍚嶇О
       * @param val   cookie鍊�
       * @param time  杩囨湡鏃堕棿(澶�)
       * @param path  cookie璺緞
       */
      set: function (key, val, time, path) {
        var date = new Date();
        var expiresDays = time;
        date.setTime(date.getTime() + expiresDays * 24 * 3600 * 1000);
        document.cookie = key + "=" + val + ";expires=" + date.toGMTString() + (path ? (";path=" + path) : '');
      },
      /**
       * 鑾峰彇cookie
       * @param key cookie鍚嶇О
       * @returns {*}
       */
      get: function (key) {
        var getCookie = document.cookie.replace(/[ ]/g, "");
        var arrCookie = getCookie.split(";");
        var tips;
        for (var i = 0; i < arrCookie.length; i++) {
          var arr = arrCookie[i].split("=");
          if (key === arr[0]) {
            tips = arr[1];
            break;
          }
        }
        return tips;
      },
      /**
       * 鍒犻櫎cookie
       * @param key
       */
      delete: function (key) {
        var date = new Date();
        date.setTime(date.getTime() - 1);
        document.cookie = key + "=; expires=" + date.toGMTString() + ";path=/";
      },
      /**
       * Has
       * @param key
       * @returns {boolean}
       */
      has: function (key) {
        return app.cookie.get(key) ? true : false;
      }
    },
    /**
     * 瀛楄妭鎹㈢畻
     * @param bytes
     * @returns {string}
     */
    bytesToSize: function (bytes) {
      if (bytes === 0) return '0 B';
      var k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'],
        i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    },
    versionCompare: function (ver, newVer) {
      var sources = ver.split('.');
      var dests = newVer.split('.');
      var maxL = Math.max(sources.length, dests.length);
      var result = 0;
      for (var i = 0; i < maxL; i++) {
        let preValue = sources.length > i ? sources[i] : 0;
        let preNum = isNaN(Number(preValue)) ? preValue.charCodeAt() : Number(preValue);
        let lastValue = dests.length > i ? dests[i] : 0;
        let lastNum = isNaN(Number(lastValue)) ? lastValue.charCodeAt() : Number(lastValue);
        if (preNum < lastNum) {
          result = -1;
          break;
        } else if (preNum > lastNum) {
          result = 1;
          break;
        }
      }
      return result;
    },
    /**
     * 鎵ц鏇存柊
     */
    upgrade: function (backup) {
      var loading = false;
      if (loading) return;
      loading = true;
      var content = '<div class="mdui-valign">' +
        '<div class="mdui-spinner mdui-spinner-colorful mdui-m-r-3"></div>' +
        '鍗囩骇涓�, 璇蜂笉瑕佸叧闂獥鍙�...' +
        '</div>';
      var error = '鍗囩骇澶辫触, 璇风◢鍚庨噸璇�(甯姪鏂囨。: <a target="_blank" href="https://www.kancloud.cn/wispx/lsky-pro/1569428">https://www.kancloud.cn/wispx/lsky-pro/1569428</a>)';
  
      $d = mdui.dialog({
        overlay: true,
        modal: true,
        buttons: [],
        closeOnEsc: false,
        content: content
      });
      $d.$dialog.css({'max-width': '300px'});
      mdui.mutation();
      var upgradeCallback = function () {
        setTimeout(function () {
          $.ajax({
            url: '/admin/system/upgrade.html',
            type: 'POST',
            success: function (res) {
              mdui.alert(res.msg, '绯荤粺鎻愮ず', function () {
                history.go(0);
              }, {
                modal: true,
                closeOnEsc: true,
              });
            },
            complete: function () {
              $d.close();
              loading = false;
            },
            error: function () {
              mdui.alert(error, '绯荤粺鎻愮ず');
            }
          });
        }, 1000)
      };
  
      if (backup) {
        $.ajax({
          url: '/admin/system/backup.html',
          type: 'POST',
          success: function (res) {
            if (res.code) {
              upgradeCallback();
            } else {
              $d.close();
              loading = false;
              mdui.alert(res.msg, '绯荤粺鎻愮ず', function () {
                history.go(0);
              }, {
                modal: true,
                closeOnEsc: true,
              });
            }
          },
          error: function () {
            $d.close();
            loading = false;
            mdui.alert(error, '绯荤粺鎻愮ず');
          }
        });
      } else {
        upgradeCallback();
      }
    },
    /**
     * 妫€娴嬬増鏈洿鏂�
     * @param ver
     * @param auto
     */
    getLastVer: function (ver, auto) {
      $.ajax({
        url: 'https://api.lsky.pro/releases.php?version=last',
        success: function (response) {
          if (app.versionCompare(ver, response.version) === 0) {
            // 宸茬粡鏄渶鏂扮増
            auto && app.msg(true, '宸茬粡鏄渶鏂扮増鏈�');
          } else {
            if (!app.cookie.has('no_update') || auto) {
              mdui.dialog({
                title: '妫€娴嬪埌鏂扮増鏈琜' + response.version + ']',
                content: '<div class="markdown-body mdui-p-l-3 mdui-p-r-3">' + marked(response.info) + '</div>',
                modal: true,
                history: false,
                buttons: [
                  {
                    text: '蹇界暐'
                  },
                  {
                    text: '涓嶅啀鎻愮ず',
                    onClick: function () {
                      app.cookie.set('no_update', true, 30, '/');
                    }
                  },
                  {
                    text: '绔嬪嵆鍗囩骇',
                    close: false,
                    onClick: function (inst) {
                      inst.close();
                      mdui.confirm(
                        '灏嗕細鍦ㄥ崌绾у墠澶囦唤鍘熺郴缁熸枃浠�, 浣嗕笉鍖呮嫭 runtime 鍜� public 鐩綍浠ュ強鏁版嵁搴�',
                        '鈿� 鏄惁闇€瑕佸浠藉師绯荤粺?',
                        function () {
                          app.upgrade(true);
                        },
                        function () {
                          app.upgrade(false);
                        },
                        {
                          confirmText: '澶囦唤',
                          cancelText: '涓嶅浠�',
                          modal: true,
                          closeOnEsc: false,
                        }
                      );
                    }
                  }
                ]
              });
            }
          }
          auto && app.cookie.delete('no_update');
        }
      });
    },
    toggleTheme: function () {
      var theme = app.cookie.get('theme') || 'light';
      theme = theme === 'dark' ? 'light' : 'dark';
      app.cookie.set('theme', theme, 30, '/');
      $('body')[theme === 'dark' ? 'addClass' : 'removeClass']('mdui-theme-layout-dark');
      $('#set-theme i').html(theme === 'dark' ? '&#xe3ac;' : '&#xe3a9;');
    }
  };