create table contributions (
  date date not null,
  repo text not null,
  private boolean not null,
  count int not null,
  primary key (date, repo)
);

alter table contributions enable row level security;
