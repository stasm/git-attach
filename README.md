git-attach
==========

A git extension to attach patches to Bugzilla.

Attach the output of `git-diff` to a bug in Bugzilla.  Arguments passed to 
`git-attach` will be the arguments which `git-diff` will be invoked with.  For 
instance, `git attach master...` will attach the output of `git diff 
master...`.  If `<range>` is not given, `git-attach` will invoke `git-diff` 
with no arguments, resulting in the diff between the working copy and the 
index. 

The bug number can be specified explicitly with `--bug <id>` or will be 
extracted from the current branch name (see `--bug-regexp`).

For options not provided on the command line, `git-attach` will interactively 
ask for user input.  If `--username` and `--password` are not given, 
`git-attach` will try to read `$HOME/.netrc` or `%HOME%\_netrc` on Windows.  
Only https://bugzilla.mozilla.org is supported at the moment.

More information about the usage can be found in the [manual][].

[manual]: https://github.com/stasm/git-attach/blob/master/man/doc.md


## Installation

    $ [sudo] npm install git-attach -g


## Example use

`git-attach` requires at least Node.js 0.11, run with `--harmony` or 
`--harmony-generators`.

On Unix-like systems, if your Node.js binary is installed in `/usr/bin/node`, 
you should be able to run `git-attach` as follows:

    git attach master...
    git attach --bug 900000
    git attach v1-train...bug900000-feature-branch

If this doesn't work, you can resort to invoking Node.js manually:

    /usr/bin/nodejs --harmony-generators ./index.js

## Changelog

 - 0.0.3 (September 25, 2013)

   - pass arguments to `git-diff` without any modifications, also when no 
     arguments are present (previously, `master...HEAD` was assumed by default 
     which made it impossible to attach a diff between the current working copy 
     and the index)

 - 0.0.2 (September 18, 2013)

   - query the bug for existing patches and obsolete them upon user's request

 - 0.0.1 (September 18, 2013)

   - attach the output of git-diff


## Related projects

 - [git-bz][] - written in Python, supports sending & fetching patches, filing 
   new bugs and closing existing ones,

 - [pybugzilla][] - written in Python, supports sending patches and fetching 
   them, as well as submitting pull requests.

[git-bz]: http://git.fishsoup.net/cgit/git-bz/tree/git-bz.txt
[pybugzilla]: https://github.com/toolness/pybugzilla
