FROM php:8.3-apache
RUN apt-get update && apt-get install -y --no-install-recommends libpq-dev \
 && docker-php-ext-install pdo pdo_pgsql \
 && rm -rf /var/lib/apt/lists/* \
 && a2enmod rewrite headers
RUN sed -ri 's!AllowOverride None!AllowOverride All!g' /etc/apache2/apache2.conf
COPY . /var/www/html/
RUN chown -R www-data:www-data /var/www/html
CMD ["sh","-c","sed -i \"s/Listen 80/Listen ${PORT:-10000}/\" /etc/apache2/ports.conf && sed -i \"s/:80>/:${PORT:-10000}>/\" /etc/apache2/sites-enabled/000-default.conf && apache2-foreground"]
