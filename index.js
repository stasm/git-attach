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
  reBug: {
    string: '-r REGEXP, --bug-regexp REGEXP', 
    default: '^(?:bug-?)?(\\d{5,})',
    help: 'Regular expression to match bug numbers in branch names'
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
    default: '',
    help: 'git-revisions-style range of commits to diff'
  },
  test: {
    flag: true,
    help: 'Use a test Bugzilla instance'
  }
}).parse();

var reBug = new RegExp(opts.reBug);

// landfill has a different flag set than bmo
if (opts.test) {
  availableFlags.review = 1;
}

co(function*(){

  var bugzilla = yield getAuthenticatedBugzillaClient();

  if (!opts.bug) {
    opts.bug = yield getBugNumber();
  }

  if (!opts.description) {
    opts.description = yield getDescription();
  }

  if (!opts.comment || opts.comment === '') {
    opts.comment = yield getComment();
  }

  if (opts.flag) {
    opts.flag = opts.flag.map(parseFlag);
  } else {
    opts.flag = yield getFlags();
  }

  // obsolete old patches
  // XXX ideally, the bugAttachments request would happen in parallel with the 
  // user writing the comment
  console.log('Getting existing attachments…');
  var prevAttachments = yield bugzilla.bugAttachments(opts.bug);
  var prevPatches = prevAttachments.filter(function(attachment) {
    return attachment.is_patch && !attachment.is_obsolete;
  });
  if (prevPatches.length) {
    prevPatches.forEach(function(patch, i) {
      console.log('  '  + (i + 1) + ') ' + patch.description +
                  ' (by ' + patch.attacher.name + ')'); });
    var toObsolete = yield prompt('Patch numbers to obsolete ' +
                                  '(space-separated, Enter for none)? ');
    toObsolete = toObsolete.split(' ').filter(function(part) {
      return part !== '';
    });
    var okResponses = yield toObsolete.map(function(index) {
      var patch = prevPatches[parseInt(index) - 1];
      patch.is_obsolete = true;
      return bugzilla.updateAttachment(patch.id, patch);
    });
    console.log(okResponses.length + ' obsoleted.');
  }

  // create patch
  var diff = yield exec('git diff ' + opts.range);
  var attachment = {
    file_name: opts.bug + '.patch',
    is_patch: true,
    data: new Buffer(diff).toString('base64'),
    encoding: 'base64',
    description: opts.description,
    comments: [{
      text: opts.comment
    }],
    flags: opts.flag
  }

  // post
  console.log('Submitting the patch…');
  var att = yield bugzilla.createAttachment(opts.bug, attachment);
  console.log('Patch submitted!');
  console.log('  https://bugzilla.mozilla.org/attachment.cgi?id=' + att + 
              '&action=edit');
  process.exit(0);
});


function Flag(name, requestee) {
  this.name = name;
  this.type_id = availableFlags[name];
  this.status = '?';
  this.requestee = { name: requestee };
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

function getAuthenticatedBugzillaClient() {
  return function*() {
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

    var client = bz.createClient({
      username: credentials.login,
      password: credentials.password,
      test: opts.test
    });

    return {
      bugAttachments: co.wrap(client.bugAttachments, client),
      createAttachment: co.wrap(client.createAttachment, client),
      updateAttachment: co.wrap(client.updateAttachment, client)
    };
  };
}

function getBugNumber() {
  return function*() {
    var branch = yield exec('git rev-parse --abbrev-ref HEAD');
    var matches = reBug.exec(branch.trim())
    if (!matches) {
      console.error('No valid bug ID found in the current branch name');
      process.exit(1);
    }
    return parseInt(matches[1]);
  }
}

function getDescription() {
  return function*() {
    var description = yield prompt('One-line description: ');
    if (!description) {
      console.error('Patch description is required');
      process.exit(1);
    }
    return description;
  };
}

function getComment() {
  var temp = co.wrap(tmp.file);
  var edit = co.wrap(editor);

  // XXX use co-fs when fixed in node 0.11
  // https://github.com/visionmedia/co-fs/issues/2
  // var fs = require('co-fs');
  function readFile(path, encoding) {
    return function(cb){
      fs.readFile(path, encoding, cb);
    }
  }

  return function*() {
    // tmpFile is [path, descriptor]
    var tmpFile = yield temp({ postfix: '.markdown' });
    process.stdin.pause();
    yield edit(tmpFile[0]);
    return yield readFile(tmpFile[0], 'utf8');
  };
}

function getFlags() {
  return function*() {
    flags = [];
    for (var flag in availableFlags) {
      if (!availableFlags.hasOwnProperty(flag)) {
        continue;
      }
      var requestee = yield prompt(flag + '? ');
      if (requestee) {
        flags.push(new Flag(flag, requestee));
      }
    }
    return flags;
  };
}
