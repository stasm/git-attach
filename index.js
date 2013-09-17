#!/usr/bin/node --harmony-generators

var fs = require('fs');
var bz = require('bz');
var co = require('co');
var tmp = require('tmp');
var netrc = require('netrc');
var exec = require('co-exec');
var editor = require('editor');
var nomnom = require('nomnom');
var prompt = require('co-prompt');

var availableFlags = {
  'feedback': 607, 
  'review': 4
}

var opts = nomnom.options({
  username: {
    string: '-u USERNAME, --username USERNAME', 
    help: 'Bugzilla username'
  },
  password: {
    string: '-p PASSWORD, --password PASSWORD', 
    help: 'Bugzilla password'
  },
  bug: {
    string: '-b ID, --bug ID', 
    help: 'Bug number'
  },
  flag: {
    string: '-f FLAG, --flag FLAG', 
    list: true,
    help: 'A flag to be requested (more than one is ok)'
  },
  description: {
    string: '-d TEXT, --description TEXT', 
    help: 'Short description of the attachment'
  },
  comment: {
    string: '-c TEXT, --comment TEXT', 
    help: 'Comment to accompany the attachment'
  },
  range: {
    metavar: 'RANGE',
    position: 0,
    default: 'master...HEAD',
    help: 'git-revisions-style range of commits to diff'
  },
  test: {
    flag: true,
    help: 'Use a test Bugzilla instance'
  }
}).parse();

// landfill has a different flag set than bmo
if (opts.test) {
  availableFlags.review = 1;
}

function parseFlag(str) {
  var parts = str.split('?');
  if (parts.length !== 2) {
    console.error('Set a flag using the flagname?requestee syntax');
    process.exit(1);
  }
  if (!(parts[0] in availableFlags)) {
    console.error('Flag not supported: ' + parts[0]);
    process.exit(1);
  }
  return new Flag(parts[0], parts[1]);
}

function Flag(name, requestee) {
  this.name = name;
  this.type_id = availableFlags[name];
  this.status = '?';
  this.requestee = { name: requestee };
}

var edit = co.wrap(editor);
var temp = co.wrap(tmp.file);

// XXX use co-fs when fixed in node 0.11
// https://github.com/visionmedia/co-fs/issues/2
// var fs = require('co-fs');
function readFile(path, encoding) {
  return function(cb){
    fs.readFile(path, encoding, cb);
  }
}

function getBzAPIClient(credentials) {
  var client = bz.createClient({
    username: credentials.login,
    password: credentials.password,
    test: opts.test
  });

  return {
    createAttachment: co.wrap(client.createAttachment, client)
  };
}



co(function*(){

  var credentials = {};
  if (opts.username && opts.password) {
    credentials.login = opts.username;
    credentials.password = opts.password;
  } else if (opts.username) {
    credentials.login = opts.username;
    credentials.password = yield prompt.password('Bugzilla password: ');
  } else {
    credentials = netrc()['api-dev.bugzilla.mozilla.org'];
    if (!credentials) {
      credentials.login = yield prompt('Bugzilla username: ');
      credentials.password = yield prompt.password('Bugzilla password: ');
    }
  }
  var bugzilla = getBzAPIClient(credentials);

  if (!opts.bug) {
    var branch = yield exec('git rev-parse --abbrev-ref HEAD');
    var matches = /^(bug)?(\d{5,})/.exec(branch.trim())
    if (!matches) {
      console.error('No valid bug ID found in the current branch name');
      process.exit(1);
    }
    opts.bug = parseInt(matches[2]);
  }

  if (!opts.description) {
    opts.description = yield prompt('One-line description: ');
  }

  if (!opts.comment || opts.comment === '') {
    // tmpFile is [path, descriptor]
    var tmpFile = yield temp({ postfix: '.markdown' });
    process.stdin.pause();
    yield edit(tmpFile[0]);
    opts.comment = yield readFile(tmpFile[0], 'utf8');
  }

  if (opts.flag) {
    opts.flag = opts.flag.map(parseFlag);
  } else {
    opts.flag = [];
    for (var flag in availableFlags) {
      if (!availableFlags.hasOwnProperty(flag)) {
        continue;
      }
      var requestee = yield prompt(flag + '? ');
      if (requestee) {
        opts.flag.push(new Flag(flag, requestee));
      }
    }
  }

  var diff = yield exec('git diff ' + opts.range);
  var attachment = {
    file_name: opts.bug + '.patch',
    is_patch: true,
    data: new Buffer(diff).toString('base64'),
    encoding: 'base64',
    description: opts.description,
    comments: [{
      text: opts.flag
    }],
    flags: requestedFlags
  }

  // post
  var att = yield bugzilla.createAttachment(opts.bug, attachment);
  console.log('https://bugzilla.mozilla.org/attachment.cgi?id=' + att + '&action=edit');
  process.exit(0);
});
