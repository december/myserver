var fs = require('fs');
var path = require('path');

var wechat = require('wechat');
var ejs = require('ejs');
var alpha = require('alpha');
var VIEW_DIR = path.join(__dirname, '..', 'views');

var config = require('../config');

var oauth = new wechat.OAuth(config.appid, config.appsecret);

var List = require('wechat').List;
List.add('view', [
  ['抱歉，我听不懂！']
]);


var callbackTpl = ejs.compile(fs.readFileSync(path.join(VIEW_DIR, 'callback.html'), 'utf-8'));

exports.callback = function (req, res) {
  res.writeHead(200);
  oauth.getAccessToken(req.query.code, function (err, result) {
    res.end(callbackTpl(req.query));
  });
};

exports.reply = wechat(config.mp, wechat.text(function (message, req, res) {
  console.log(message);

  /*
  var API = wechat.API, appid = 'wxd34aa823b8e85243', secret = 'f6366cbad50f6bb6b4fbc31c262de298';  
  var api = new API(appid, secret);
  var menu = fs.readFileSync('./menu.json');
  if (menu) {
    menu = JSON.parse(menu);
  }
  api.createMenu(menu, function(err, result){})
  */
  var input = (message.Content || '').trim();

  if (input === 'login') {
    res.reply([{
      title: '登陆页面',
      description: '去登陆',
      picurl: config.domain + '/assets/qrcode.jpg',
      url: config.domain + '/login'
    }]);
    return;
  }

  if (input === '我要注册') {
    return res.reply("为了快递们的安全，我们需要验证您的身份，请回复我们以下信息：“你的姓名＋院系＋学号＋手机号”，并把您的学生证照片发给我们，我们会好好保护您的隐私的！");
  }
  if (input === '需要帮助') {
    return res.reply("亲，别着急，“THU咻不”来帮您啦！快快回复您快递的基本信息吧：“所取快递重量（重or不重）+体积（大or不大）+投放目的地（具体宿舍楼号以及单元门号）”");
  }
  if (input === '提供帮助') {
    return res.reply("哇塞！亲，您真是一个乐于助人的好青年！\n欢迎使用“THU咻不”！麻烦您回复可以提供帮助的时间区间，格式例如7:00-8:00或者13:00-16:00，您辛苦啦！我们将尽快为您匹配代取快递啦！");
  }
  if (input === '已投放') {
    return res.reply("予人玫瑰，手有余香！\n感谢您的帮助，您的好人费将在对方用户确认快递之后存入“钱包”当中哈！\n希望“THU咻不”的服务您能满意！爱你呦，下次再见！！");
  }
  if (input === '刘建平') {
    return res.reply("什么时候发演出的票！");
  }
  if (input === '杨凯杰') {
    return res.reply("比宋仲基帅多了！");
  }
  if (input === '游伊慧') {
    return res.reply("不让我们取冰箱我们还能做朋友。");
  }
  if (input === '韩勇') {
    return res.reply("给一块钱就愿意帮人取快递的好青年。");
  }
  if (input === '路云飞') {
    return res.reply("赶紧祝我答辩顺利。")
  };
  if (input.length < 2) {
    return res.reply('能不能跟我说完整的句子呢～');
  }
  else  {
    return res.reply('抱歉，我听不懂！');
  }
  var data = alpha.search(input);
  var from = message.FromUserName;
  console.log(content);
  res.reply(content);
}).image(function (message, req, res) {
  console.log(message);
  res.reply('恭喜您注册成功！我们会尽快为您审核！');
}).location(function (message, req, res) {
  console.log(message);
  res.reply('已经收到您发送的位置～');
}).voice(function (message, req, res) {
  console.log(message);
  res.reply('让我说话是要收费的。');
}).link(function (message, req, res) {
  console.log(message);
  res.reply('这个链接好奇怪……');
}).event(function (message, req, res) {
  console.log(message);
  if (message.Event === 'subscribe') {
    // 用户添加时候的消息
    res.reply('啊哈，欢迎关注“THU咻不”！:)\n有了我们你就再也不怕没时间取快递啦！你也通过可以帮助别人来赚笔小钱哦！快快点击下方的“我要注册”加入我们吧！');
  } else if (message.Event === 'unsubscribe') {
    res.reply('Bye!');
  } else {
    res.reply('暂未支持! Coming soon!');
  }
}));

var tpl = ejs.compile(fs.readFileSync(path.join(VIEW_DIR, 'detail.html'), 'utf-8'));
exports.detail = function (req, res) {
  var id = req.query.id || '';
  var info = alpha.access(alpha.getKey(id));
  if (info) {
    res.writeHead(200);
    res.end(tpl(info));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
};

var loginTpl = ejs.compile(fs.readFileSync(path.join(VIEW_DIR, 'login.html'), 'utf-8'));

exports.login = function (req, res) {
  res.writeHead(200);
  var redirect = 'http://nodeapi.diveintonode.org/wechat/callback';
  res.end(loginTpl({authorizeURL: oauth.getAuthorizeURL(redirect, 'state', 'snsapi_userinfo')}));
};
