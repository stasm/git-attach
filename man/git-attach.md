git-attach(1) - Attach diff as patch to Bugzilla
================================================


## SYNOPSIS

    git attach [options] [<range>]


## DESCRIPTION

Attach the output of `git-diff <range>` to a bug in Bugzilla.  The default 
range is "master...HEAD".  The bug number can be specified excplicitly with 
`--bug <id>` or will be extracted from the current branch name (see 
`--bug-regexp`).

For options not provided on the command line, `git-attach` will interactively 
ask for user input.

If `--username` and `--password` are not given, `git-attach` will try to read 
`$HOME/.netrc`.  See AUTHENTICATION for more information.

`git-attach` currently only works with bugzilla.mozilla.org.


## EXAMPLES

    git attach master...
    git attach --bug 900000
    git attach v1-train...bug900000-feature-branch


## OPTIONS

* `-b <id>, --bug <id>`

    The id of the bug to attach the patch to.  If not given, `git-attach` will 
    try to parse the current branch name and extract the bug id from it.  See 
    `--bug-regexp`.

* `-r <regexp>, --bug-regexp <regexp>`

    `git-attach` will use <regexp> to try to extract the bug number from the 
    curent branch name, if no bug number was given with `--bug`.  The first 
    parenthesized substring match will be used.  The default regexp is:

        ^(?:bug-?)?(\\d{5,})

* `-f <flag>, --flag <flag>`

    A flag to be requested on the attachment.  Supported flags: `review`, 
    `feedback`.  The <flag> argument should be specified in the 
    "flagname?requestee" syntax, e.g.

        git attach --flag "review?:stas"

    Specifying more than one flag is allowed, e.g.

        git attach --flag "review?:stas" --flag "feedback?:l10n"

* `-d <text>, --description <text>`

    A short one-line description of the patch which will be used as the name of 
    the attachment.

* `-c <text>, --comment <text>`

    A longer comment accompanying the attachment.

* `-u <username>, --username <username>`

    Bugzilla username for authentication with the API.

* `-p <password>, --password <password>`

    Bugzilla password for authentication with the API.


## AUTHENTICATION

Bugzilla credentials can be passed excplicitly on the command line with 
`--username` and `--password` options.

If not given, `git-attach` will try to read `$HOME/.netrc` (or `%HOME%\_netrc` 
on Windows).  The format of a `.netrc` file is as follows:

    machine api-dev.bugzilla.mozilla.org
    login your.email.address@example.com
    password P455w0rd

If `.netrc` is not found or doesn't contain the credentials for 
api-dev.bugzilla.mozilla.org, git-attach will interactively ask for the 
username and password.


## SEE ALSO

    git-diff(1)


## REPORTING BUGS

Report bugs at https://github.com/stasm/git-attach/issues.
