var fs = require('fs');
var path = require('path');

var wechat = require('wechat');
var ejs = require('ejs');
var alpha = require('alpha');
var VIEW_DIR = path.join(__dirname, '..', 'views');

var config = require('../config');
var request = require('request');
var oauth = new wechat.OAuth(config.appid, config.appsecret);

var hlist = {};
var glist = [];
fs.readFile('userdata', function(err, data) {  //读取用户信息
  if (err) {
    console.error(err);
  }
  else {
    //console.log(data);
    var userinfo = data.toString().split('\n');
    var usernum = userinfo.length - 1;
    console.log(usernum);
    for (var i = 0;i < usernum;i++) {
      var unitinfo = userinfo[i].split('+');
      glist.push({id:unitinfo[0], name:unitinfo[1], major:unitinfo[2], snum:unitinfo[3], pnum:unitinfo[4], checked:unitinfo[5], sbegin:unitinfo[6], send:unitinfo[7], charge:unitinfo[8], remain:unitinfo[9]});
    }
  }
  return;
})

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

function rightTime(timeinfo)
{
  timeinfo[0] = parseInt(timeinfo[0]);
  timeinfo[1] = parseInt(timeinfo[1]);
  if (timeinfo[0] < 0 || timeinfo[0] > 23 || timeinfo[1] < 0 || timeinfo[1] > 59)
    return 0;
  if (timeinfo[0] < 8 || timeinfo[0] > 18)
    return 1;
  if (timeinfo[0] == 18 && timeinfo[1] > 30)
    return 1;
  var now = new Date();
  var hour = now.getHours();
  var minute = now.getMinutes();
  if (timeinfo[0] < hour || (timeinfo[0] == hour && timeinfo[1] < minute))
    return 2;
  return 3;
}

function busyTime(timeString)
{
  var timeinfo = timeString.split(':');
  timeinfo[0] = parseInt(timeinfo[0]);
  timeinfo[1] = parseInt(timeinfo[1]);
  if (timeinfo[0] < 0 || timeinfo[0] > 23 || timeinfo[1] < 0 || timeinfo[1] > 59)
    return 0;
  if (timeinfo[0] < 8)
    return -1;
  var timeint = timeinfo[0] * 100 + timeinfo[1];
  var now = new Date();
  var nowint = now.getHours() * 100 + now.getMinutes();
  if (nowint > 1830)
    return -2;
  if (timeint < nowint)
    return 1;
  if (timeint >= 1130 && timeint <= 1330 && nowint >= 1130 && nowint <= 1130)
    return 2;
  if (timeint >= 1700 && timeint <= 1830 && nowint >= 1700 && nowint <= 1830)
    return 3;
  return 4;
}

function judgeTime(spareend, sparebegin, latest)
{
  var timeinfo = spareend.split(':');
  timeinfo[0] = parseInt(timeinfo[0]);
  timeinfo[1] = parseInt(timeinfo[1]);
  var timeint = timeinfo[0] * 100 + timeinfo[1];
  var now = new Date();
  var nowint = now.getHours() * 100 + now.getMinutes();
  if (timeint <= nowint)
    return 0; //过期
  var lateinfo = latest.split(':');
  lateinfo[0] = parseInt(lateinfo[0]);
  lateinfo[1] = parseInt(lateinfo[1]);
  var lateint = lateinfo[0] * 100 + lateinfo[1];
  var begininfo = sparebegin.split(':');
  begininfo[0] = parseInt(begininfo[0]);
  begininfo[1] = parseInt(begininfo[1]);
  var beginint = begininfo[0] * 100 + begininfo[1];
  if (timeint <= beginint)
    return 1; //非法
  if (beginint < lateint)
    return 2; //合法且可用
  return 3; //合法但不可用

}

exports.reply = wechat(config.mp, wechat.text(function (message, req, res) {
  console.log(message);

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
  if (input === '提现') {
    var ctname = message.FromUserName;
    for (var item in glist) {
      if (glist[item].id == ctname) {
        if (glist[item].remain < 5) 
          return res.reply("Sorry亲，您的余额不足五元，暂时无法提现。");
        else
          return res.reply([{
                    title: '收款二维码',
                    description: '扫一扫二维码提现5元',
                    picurl: config.domain + '/assets/paycode.jpg',
                  }]);
      }
    }
    return res.reply("Sorry亲，您尚未注册！");
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
    glist[0].checked = 1;
    return res.reply("已授权。");
  }
  if (input.length < 2) {
    return res.reply('能不能跟我说完整的句子呢～');
  }
  if (input.indexOf('#') == 0) { //注册信息
    var ctname = message.FromUserName;
    for (var item in glist) {
      console.log(glist[item].id);
      if (glist[item].id === ctname) {
        return res.reply('Sorry亲，您已经注册过了！');
      }
    }
    //存储用户信息
    var info = input.substring(1);
    var infoarray = info.split('+');
    glist.push({id:ctname, name:infoarray[0], major:infoarray[1], snum:infoarray[2], pnum:infoarray[3], checked:0, sbegin:0, send:0, charge:0, remain:0});
    console.log(glist);
    info = ctname + '+' + info + '+0+0+0+0+0\n';
    fs.appendFile('userdata', info, function(err) {
      if (err) 
        console.log("FAIL:" + err);
      else
        console.log("信息已写入");
    })
    return res.reply('已存储您的信息，接下来请上传您的学生卡照片！');
  }
  if (input.indexOf('@') == 0) {
    //get 系统时间，检验时间段是否合法

    var timeinfo = input.substring(1).split('-');
    var timeresult = rightTime(timeinfo[0].split(':'));
    var tr = rightTime(timeinfo[1].split(':'));
    if (timeresult > tr)
      timeresult = tr;
    var timeresult = min(rightTime(timeinfo[0].split(':')), rightTime(timeinfo[1].split(':')));
    if (timeresult == 0)
      return res.reply('您输入的时间格式不正确，请输入8:00-18:30之间的时间段。');
    if (timeresult == 1)
      return res.reply('这个时间段无法取快递哦，请输入8:00-18:30之间的时间段。');
    if (timeresult == 2)
      return res.reply('空闲时间开始与结束时间均不能早于当前时间，请重新输入。');
    var ctname = message.FromUserName;
    for (var item in glist) {
      if (glist[item].id === ctname) {
        glist[item].sbegin = timeinfo[0];
        glist[item].send = timeinfo[1];
      }
    }
    return res.reply('已存储您的空闲时间信息，匹配成功时我们会将您的姓名、院系和手机号码提供给需要取快递的同学，由TA来联系您，请保持手机畅通！');
    //将spare time区间存入glist中
  }
  if (input.indexOf('*') == 0) {
    //get 系统时间
    var price = 3;
    var info = input.substring(1).split('+');
    var timeresult = busyTime(info[3]);
    if (timeresult == -1)
      return res.reply('Sorry亲，您填写的最晚领取时间早于快递点上班时间，是不是填错了呢？');
    if (timeresult == -2)
      return res.reply('Sorry亲，现在太晚啦，快递点也下班了，请明天再发布需求吧～');
    if (timeresult == 0)
      return res.reply('Sorry亲，您填写的最晚领取时间格式有误！');
    if (timeresult == 1)
      return res.reply('Sorry亲，您填写的最晚领取时间早于当前时间，是不是填错了呢？');
    if (timeresult == 4 && info[0] === '不重' && info[1] === '不大')
      price = 2;
    if (timeresult < 4 && (info[0] === '重' || info[1] === '大'))
      price = 5;
    var ctname = message.FromUserName;
    var found = 0;
    for (var item in glist) {
      if (glist[item].id != ctname && parseInt(glist[item].sbegin) != 0) {
        var flag = judgeTime(glist[item].send, glist[item].sbegin, info[3]);
        if (flag == 0) {
          glist[item].sbegin = 0;
          glist[item].send = 0;
        }
        if (flag == 1) {
          glist[item].sbegin = 0;
          glist[item].send = 0;
        }
        if (flag == 2) {
          var temp = {};
          temp.id = glist[item].id;
          temp.price = price;
          temp.flag = 0;
          hlist.ctname = temp;
          found = 1;
          break;
        }
        //如果空闲时间已过期，则归零；如果空闲时间满足条件，则得到用户金额，将用户id存储到hlist
      }
    }
    if (found == 0) {
      //没找到合适的用户，记录默认用户信息
      var temp = {};
      var item = glist[0];
      temp.id = item.id;
      temp.price = price;
      temp.flag = 0;
      hlist.ctname = temp;
    }
    rstring = "亲你久等啦！根据您的快递情况，价格为"+price.toString()+"元哦～～是不是超划算？如果您愿意接受，请扫描下面的二维码进行支付，并在支付完成后点击“支付完成”菜单项。";
    res.reply([{
      title: '付款消息',
      description: rstring,
      picurl: config.domain + '/assets/charge'+price.toString()+'.jpg',
    }]);
    return;
    //发布付款二维码
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
  var ctname = message.FromUserName;
  for (var item in glist) {
    if (glist[item].id === ctname) {
      if (glist[item].checked != 0)
        return res.reply('您已注册且已通过审核！');
      else {
        //保存图片
        var picurl = message.PicUrl;
        var picname = 'userphoto/' + ctname + '.png';
        request(picurl).pipe(fs.createWriteStream(picname));
        return res.reply('恭喜您注册成功！我们会尽快为您审核！');
      }
    }
  }
  return res.reply('Sorry亲，请先按“#你的姓名＋院系＋学号＋手机号”的格式回复个人信息进行注册。');
}).location(function (message, req, res) {
  console.log(message);
  res.reply('已经收到您发送的位置～');
}).voice(function (message, req, res) {
  console.log(message);
  res.reply('让我说话是要收费的。');
}).link(function (message, req, res) {
  console.log(message);
  res.reply('不要发奇怪的链接啦。');
}).event(function (message, req, res) {
  console.log(message);
  if (message.Event === 'subscribe') {
    // 用户添加时候的消息
    res.reply('啊哈，欢迎关注“THU咻不”！:)\n有了我们你就再也不怕没时间取快递啦！你也通过可以帮助别人来赚笔小钱哦！快快点击下方的“我要注册”加入我们吧！');
  } else if (message.Event === 'unsubscribe') {
    res.reply('Bye!');
  } else if (message.Event === 'CLICK') {
    if (message.EventKey === 'SignIn') {
      //get 用户信息
      var ctname = message.FromUserName;
      //console.log(ctname+' SignIn');
      for (var item in glist) {
        if (glist[item].id === ctname) {
          if (glist[item].checked != 0)
            return res.reply("您已注册并通过审核！");
          else
            return res.reply("您已提交注册申请，请耐心等待审核！");
        }
      }
      return res.reply("为了快递们的安全，我们需要验证您的身份，请回复我们以下信息：“#你的姓名＋院系＋学号＋手机号”，并把您的学生证照片发给我们，我们会好好保护您的隐私的！");
    }
    if (message.EventKey === 'Cancel') {
      var ctname = message.FromUserName;
      for (var item in glist) {
        if (glist[item].id == ctname) {
          glist[item].send = 0;
          glist[item].sbegin = 0;
          return res.reply("已将您的可代取时间段清空～");
        }
      }
      return res.reply("Sorry亲，您尚未注册！");
    }
    if (message.EventKey === 'Finished') {
      return res.reply("予人玫瑰，手有余香！\n感谢您的帮助，您的好人费将在对方用户确认快递之后存入“钱包”当中哈！\n希望“THU咻不”的服务您能满意！爱你呦，下次再见！！");
    }
    if (message.EventKey === 'Wallet') {
      var ctname = message.FromUserName;
      for (var item in glist) {
        if (glist[item].id == ctname) {
          var rstring = "亲，您的钱包已累计金额达到"+glist[item].remain+"元，好厉害！\n您可以回复后台“提现“来提取现金，不过我们的提现金额是固定的哦，只有满5元时才可以提现！";
          return res.reply(rstring);
        }
      }
      return res.reply("Sorry亲，您尚未注册！");
    }
    if (message.EventKey === 'NeedHelp') {
      return res.reply("亲，别着急，“THU咻不”来帮您啦！快快回复您快递的基本信息吧：“*所取快递重量（重or不重）+体积（大or不大）+投放目的地（具体宿舍楼号以及单元门号）+您要求的最晚领取时间（例如18:00）”");
    }
    if (message.EventKey === 'Payed') {
      var ctname = message.FromUserName;
      if (!hlist.ctname || hlist.ctname.flag == 1)
        return res.reply("Sorry亲，您当前似乎没有需要我们取的快递～");
      var targetid = hlist.ctname.id;
      var targetinfo = '';
      for (var item in glist) {
        if (glist[item].id == targetid) {
          targetinfo = glist[item].name + ' ' + glist[item].major + ' ' + glist[item].pnum + '\n';
          break;
        }
      }
      var rstring = "哈哈哈，匹配成功啦！帮您取快递的学生信息如下：\n" + targetinfo + "请按上面的手机号联系帮您取快递的同学吧～收到快递后一定记得点击”签收确认“菜单项进行确认啊～";
      return res.reply(rstring);
    }
    if (message.EventKey === 'Checked') {
      var ctname = message.FromUserName;
      if (!hlist.ctname || hlist.ctname.flag == 1)
        return res.reply("Sorry亲，您当前似乎没有需要确认收到的快递～");
      hlist.ctname.flag = 1;
      var price = hlist.ctname.price;
      if (price == 5)
        price -= 2;
      else 
        price -= 1;
      var targetid = hlist.ctname.id;
      for (var item in glist) {
        if (glist[item].id == targetid) {
          console.log(glist[item]);
          console.log(hlist.ctname);
          glist[item].remain = (parseInt(glist[item].remain) + price).toString();
          break;
        }
      }
      return res.reply("感谢您的确认！\n谢谢您的使用，希望“THU咻不”的服务您能满意！爱你呦，下次再见！！");
    }
    if (message.EventKey === 'OfferHelp') {
      var ctname = message.FromUserName;
      for (var item in glist) {
        if (glist[item].id === ctname) {
          if (glist[item].checked != 0) {
            //写入offer time与金额
            return res.reply("哇塞！亲，您真是一个乐于助人的好青年！\n欢迎使用“THU咻不”！麻烦您回复可以提供帮助的时间区间，格式例如“@13:00-16:00“，您辛苦啦！我们将尽快为您匹配代取快递啦！");
          }
          else
            return res.reply("抱歉，由于我们尚未审核您的注册申请，您暂时无法帮人取快递，我们会尽快为您审核！");
        }
      }
      return res.reply("抱歉，您尚未注册，无法提供取快递服务！");
      }
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
