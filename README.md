git-attach
==========

A git extension to attach patches to Bugzilla.

Attach the output of `git-diff` to a bug in Bugzilla.  The default range is 
"master...HEAD".  The bug number can be specified explicitly with `--bug <id>` 
or will be extracted from the current branch name (see `--bug-regexp`).

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
