# cPanel Cron Triggers

Upload these files to cPanel, preferably outside `public_html`:

`/home/CPANEL_USER/santos-cron/moffice-sync.php`
`/home/CPANEL_USER/santos-cron/ananas-sync.php`

Set `CRON_SECRET` in both PHP files to the same value configured in Vercel.

Cron commands:

```sh
/usr/local/bin/php -q /home/CPANEL_USER/santos-cron/moffice-sync.php
/usr/local/bin/php -q /home/CPANEL_USER/santos-cron/ananas-sync.php
```

If cPanel only allows upload inside `public_html`, upload the whole folder as:

`public_html/santos-cron/`

Keep `.htaccess` in that folder so the PHP source and logs are not browsable.
