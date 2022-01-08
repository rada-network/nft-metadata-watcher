const DefaultNamingStrategy = require('typeorm').DefaultNamingStrategy;
const snakeCase = require('typeorm/util/StringUtils').snakeCase;
const pluralize = require('pluralize');

class TypeOrmNamingStrategy extends DefaultNamingStrategy {
  tableName(className, customName) {
    return customName || pluralize(snakeCase(className));
  }

  columnName(propertyName, customName, embeddedPrefixes) {
    return (
      snakeCase(embeddedPrefixes.join('_')) +
      (customName || snakeCase(propertyName))
    );
  }

  relationName(propertyName) {
    return snakeCase(propertyName);
  }

  joinColumnName(relationName, referencedColumnName) {
    return snakeCase(
      pluralize.singular(relationName) + '_' + referencedColumnName,
    );
  }

  joinTableName(
    firstTableName,
    secondTableName,
    firstPropertyName,
    secondPropertyName,
  ) {
    return snakeCase(firstTableName + '_' + secondTableName);
  }

  joinTableColumnName(tableName, propertyName, columnName) {
    return snakeCase(
      pluralize.singular(tableName) + '_' + (columnName || propertyName),
    );
  }

  classTableInheritanceParentColumnName(
    parentTableName,
    parentTableIdPropertyName,
  ) {
    return snakeCase(
      pluralize.singular(parentTableName) + '_' + parentTableIdPropertyName,
    );
  }
}

// subscribersはDIを使うためコード内から投入する
module.exports = {
  type: 'mysql',
  port: 3306,
  host: process.env.DB_HOST,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['dist/**/*.model{.ts,.js}'],
  synchronize: process.env.DB_SYNCHRONIZE === 'true' ? true : false,
  migrationsTableName: 'migrations',
  migrations: ['dist/migrations/*{.ts,.js}'],
  cli: {
    migrationsDir: 'src/migrations',
  },
  namingStrategy: new TypeOrmNamingStrategy(),
  logging: false,
  //logging: process.env.SQL_LOG ? !!process.env.SQL_LOG : false,
  extra: {
    connectionLimit:
      process.env.NODE_ENV === 'production'
        ? 125
        : process.env.NODE_ENV === 'staging'
        ? 100
        : 10,
  },
};
