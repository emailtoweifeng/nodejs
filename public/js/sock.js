var sock;
console = console || { log:function() {}, error:function() {}, warn:function() {} };
$(function () {
  sock = window.sock = io.connect();
  sock.on('connect', function () { console.log('connected...'); });
  sock.on('disconnect', function () { console.log('disconnected...'); });
  sock.on('msgs', function (msgs) { msgs.forEach(handleMessage); });
  sock.on('fare created', handleMessage);
  sock.on('passenger cancelled fare', handleMessage);
  sock.on('driver cancelled fare', handleMessage);
  sock.on('request approval', handleMessage);
  sock.on('request approved', handleMessage);
  sock.on('request denied', handleMessage);
  sock.on('picked up passenger', handleMessage);
  sock.on('dropped off passenger', handleMessage);
  navigator.geolocation.watchPosition(function (pos) {
    $.ajax({
      type:'POST',
      url: '/user/location',
      data: { 'loc[long]':pos.coords.longitude, 'loc[lat]':pos.coords.latitude },
      success: function (data, statusCode, xmlhttp) {
        console.log('data', data);
      }
    });
    //sock.emit('user location', pos.coords.longitude, pos.coords.latitude');
  });
});
function notificationPopup (msg, action, actionText, click, method, m) {
  $('#notification-popup').each(function () {
    console.log('msg', msg, 'action', action, 'actionText', actionText, 'click', click, 'method', method);
    $(this).find('form').attr('action', action);
    $(this).find('form').attr('method', method || 'post');
    $(this).find('p').html(msg);
    $(this).find('form span.ui-btn-text, button').html(actionText);
    if (click) {
      $(this).find('button').click(click);
    }
    $(this).trigger('create');
    $(this).popup();
    $(this).popup('open');
  });
}
function confirmPopup (msg, action, actionText, actionB, actionTextB, showPin) {
  $('#confirm-popup'+(showPin ? '-pin' : '')).each(function () {
    $(this).find('#cpin').val('');
    $(this).find('p').html(msg);
    $(this).find('span.a').click(action);
    $(this).find('span.a span.ui-btn-txt, button.a').each(function () {
      $(this).html(actionText);
    });
    $(this).find('span.b').click(actionB);
    $(this).find('span.b span.ui-btn-txt, button.b').each(function () {
      $(this).html(actionTextB);
    });
    $(this).trigger('create');
    $(this).popup();
    $(this).popup('open');
  });
}
function confirmDriver (fare, next) {
  var rating = 0;
  try {
    rating = Math.round((fare.driver.ratingSum / fare.driver.ratingCount));
    } catch(e) { }
  confirmPopup((function () {
    if (rating == 0 || isNaN(rating)) {
      return 'Please Approve me as your driver. (no rating available)';
    }
    else {
      return 'Please Approve me as your driver my rating is ' + (rating) + '/5';
    }
  })(), function () {
    $.ajax({
      type:'POST',
      url:'/fare/'+fare._id+'/request/denied',
      data: { },
      complete: function (data, statusCode, xmlhttp) {
        if (next) return next(false);
      }
    });
    $('#confirm-popup').popup('close');
  }, 'Deny', function () {
    $.ajax({
      type:'POST',
      url:'/fare/'+fare._id+'/request/approved',
      data: { },
      complete: function (data, statusCode, xmlhttp) {
        if (next) return next(true);
      }
    });
    $('#confirm-popup').popup('close');
  }, 'Accept', false);
}
function confirmPassage (text, action, fare, next) {
  confirmPopup(text, function () {
    $.ajax({
      type:'POST',
      dataTye:'json',
      url:'/fare/'+fare._id+'/confirm/'+action,
      data: { safe: 0, pin: $('#cpin').val() },
      success: function () { 
        if (next) return next(); 
      }
    });
  }, 'No', function () {
    $.ajax({
      type:'POST',
      dataTye:'json',
      url:'/fare/'+fare._id+'/confirm/'+action,
      data: { safe: 1, pin: $('#cpin').val() },
      success: function () { 
        if (next) return next(); 
      }
    });
  }, 'Yes', true);
}
function confirmPickup (fare, next) {
  confirmPassage('Were you safely picked up?', 'pickup', fare, next);
}
function confirmDropoff (fare, next) {
  confirmPassage('Were you safely dropped off?', 'dropoff', fare, next);
}
function handleMessage (msg) {
  console.log('msg', msg);
  if (typeof msg !== 'object') {
    console.warn('the message is not an object');
    return;
  }
  var handler = handleMessage.handlers[msg.data.action];
  if (handler) {
    handler(msg);
    sock.emit('ack', msg.data._id || msg.data._id);
  }
}
handleMessage.handlers = {
  'fare created': function (msg) {
    console.log('fare created', msg);
    notificationPopup('A fare was created in your area would you like to accept it?', '/fare/'+msg.data.content._id+'/accept', 'Accept');
  },
  'passenger cancelled fare': function (msg) {
    if (msg.content().driver === sdid) {
      notificationPopup('The passenger cancelled their fare', '/fare/queue', 'Queue', null, 'get');
    }
  },
  'driver cancelled fare': function (msg) {
    notificationPopup('The driver cancelled your fare', window.location.href, 'OK', function (event) { $('#notification-popup').popup('close'); });
  },
  'request approval': function (msg) {
    if (sdid === msg.data.actor) return;
    confirmDriver(msg.data.content);
  },
  'request approved': function (msg) {
    if (sdid === msg.data.actor) return;
    notificationPopup('The passenger accepted you', '/fare/'+msg.data.content._id, 'OK', function (event) { $('#notification-popup').popup('close'); }, 'get');
  },
  'request denied': function (msg) {
    if (sdid === msg.data.actor) return;
    notificationPopup('The passenger rejected you', '/fare/queue', 'OK', function (event) { $('#notification-popup').popup('close'); }, 'get');
  },
  'picked up passenger': function (msg) {
    console.log('picked up passenger', msg);
    console.log('%s === %s', sdid, msg.data.actor);
    if (sdid === msg.data.actor) return;
    //confirmPickup(msg.data.content);
  },
  'dropped off passenger': function (msg) {
    console.log('dropped off passenger', msg);
    console.log('%s === %s', sdid, msg.data.actor);
    if (sdid === msg.data.actor) return;
    confirmDropoff(msg.data.content, function () { window.location.href = '/fare/'+msg.data.content._id+'/rate'; });
  }
};
