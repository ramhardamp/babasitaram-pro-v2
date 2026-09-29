import 'package:flutter/material.dart';

void main() => runApp(const ModernKhataApp());

class ModernKhataApp extends StatelessWidget {
  const ModernKhataApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Guru Shree',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      useMaterial3: true,
      scaffoldBackgroundColor: const Color(0xFFF6F7FB),
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF6C4DFF)),
      cardTheme: const CardThemeData(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.all(Radius.circular(22))),
      ),
    ),
    home: const AppShell(),
  );
}

class Customer {
  final String name, phone, lastActivity;
  final double balance;
  final bool receives;
  const Customer({required this.name, required this.phone, required this.balance, required this.receives, required this.lastActivity});
}

const customers = <Customer>[
  Customer(name: 'Nitin Sharma', phone: '98•••••4210', balance: 18450, receives: true, lastActivity: 'Today, 10:42 AM'),
  Customer(name: 'Pooja Verma', phone: '97•••••8801', balance: 7250, receives: false, lastActivity: 'Yesterday, 6:18 PM'),
  Customer(name: 'Yogesh Patel', phone: '91•••••1134', balance: 12600, receives: true, lastActivity: '28 Sep, 4:05 PM'),
  Customer(name: 'Umesh Sahu', phone: '88•••••6242', balance: 3400, receives: false, lastActivity: '27 Sep, 11:31 AM'),
];

class AppShell extends StatefulWidget {
  const AppShell({super.key});
  @override State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;
  final pages = const [DashboardPage(), CustomersPage(), LedgerPage(), LoansPage(), SettingsPage()];

  @override
  Widget build(BuildContext context) {
    final wide = MediaQuery.sizeOf(context).width >= 900;
    return Scaffold(
      body: Row(children: [
        if (wide) NavigationRail(
          selectedIndex: index,
          onDestinationSelected: (v) => setState(() => index = v),
          labelType: NavigationRailLabelType.all,
          leading: Padding(padding: const EdgeInsets.symmetric(vertical: 24), child: _BrandMark()),
          destinations: const [
            NavigationRailDestination(icon: Icon(Icons.grid_view_rounded), label: Text('Home')),
            NavigationRailDestination(icon: Icon(Icons.people_alt_outlined), label: Text('Customers')),
            NavigationRailDestination(icon: Icon(Icons.receipt_long_outlined), label: Text('Ledger')),
            NavigationRailDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: Text('Loans')),
            NavigationRailDestination(icon: Icon(Icons.settings_outlined), label: Text('Settings')),
          ],
        ),
        Expanded(child: SafeArea(child: IndexedStack(index: index, children: pages))),
      ]),
      bottomNavigationBar: wide ? null : NavigationBar(
        selectedIndex: index,
        onDestinationSelected: (v) => setState(() => index = v),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.grid_view_rounded), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.people_alt_outlined), label: 'Customers'),
          NavigationDestination(icon: Icon(Icons.receipt_long_outlined), label: 'Ledger'),
          NavigationDestination(icon: Icon(Icons.account_balance_wallet_outlined), label: 'Loans'),
          NavigationDestination(icon: Icon(Icons.settings_outlined), label: 'Settings'),
        ],
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Container(
    width: 48, height: 48,
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(16),
      gradient: const LinearGradient(colors: [Color(0xFF7657FF), Color(0xFF9A7CFF)]),
    ),
    child: const Icon(Icons.auto_awesome, color: Colors.white),
  );
}

class PageFrame extends StatelessWidget {
  final String title;
  final String? subtitle;
  final Widget child;
  final List<Widget>? actions;
  const PageFrame({super.key, required this.title, required this.child, this.subtitle, this.actions});

  @override
  Widget build(BuildContext context) => LayoutBuilder(builder: (context, constraints) {
    final wide = constraints.maxWidth >= 900;
    return CustomScrollView(slivers: [
      SliverPadding(
        padding: EdgeInsets.fromLTRB(wide ? 36 : 20, 24, wide ? 36 : 20, 0),
        sliver: SliverToBoxAdapter(child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: Theme.of(context).textTheme.headlineMedium?.copyWith(fontWeight: FontWeight.w800)),
            if (subtitle != null) ...[
              const SizedBox(height: 6),
              Text(subtitle!, style: const TextStyle(color: Colors.black54)),
            ],
          ])),
          ...?actions,
        ])),
      ),
      SliverPadding(
        padding: EdgeInsets.fromLTRB(wide ? 36 : 20, 24, wide ? 36 : 20, 32),
        sliver: SliverToBoxAdapter(child: child),
      ),
    ]);
  });
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    title: 'Good morning 👋',
    subtitle: 'Your business snapshot · 29 Sep 2026',
    actions: [
      IconButton.filledTonal(onPressed: () {}, icon: const Icon(Icons.notifications_none_rounded)),
      const SizedBox(width: 8),
      const CircleAvatar(child: Text('GS')),
    ],
    child: Column(children: [
      Container(
        width: double.infinity,
        padding: const EdgeInsets.all(24),
        decoration: BoxDecoration(
          gradient: const LinearGradient(colors: [Color(0xFF5E43E8), Color(0xFF8D6BFF)]),
          borderRadius: BorderRadius.circular(28),
        ),
        child: const Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text('Total receivable', style: TextStyle(color: Colors.white70)),
          SizedBox(height: 8),
          Text('₹ 41,700', style: TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w800)),
          SizedBox(height: 18),
          Row(children: [Icon(Icons.trending_up_rounded, color: Colors.white), SizedBox(width: 8), Text('₹ 8,250 collected this month', style: TextStyle(color: Colors.white))]),
        ]),
      ),
      const SizedBox(height: 18),
      LayoutBuilder(builder: (context, c) {
        final columns = c.maxWidth > 720 ? 4 : 2;
        return GridView.count(
          crossAxisCount: columns, shrinkWrap: true, physics: const NeverScrollableScrollPhysics(),
          mainAxisSpacing: 14, crossAxisSpacing: 14, childAspectRatio: 1.35,
          children: const [
            MetricCard(icon: Icons.people_alt_outlined, label: 'Customers', value: '128'),
            MetricCard(icon: Icons.arrow_downward_rounded, label: 'To receive', value: '₹ 41.7K'),
            MetricCard(icon: Icons.arrow_upward_rounded, label: 'To pay', value: '₹ 9.4K'),
            MetricCard(icon: Icons.event_outlined, label: 'Due today', value: '₹ 6.2K'),
          ],
        );
      }),
      const SizedBox(height: 24),
      const _SectionTitle(title: 'Quick actions', action: 'View all'),
      const SizedBox(height: 12),
      Wrap(spacing: 12, runSpacing: 12, children: [
        QuickAction(icon: Icons.add_rounded, label: 'Add customer', onTap: () {}),
        QuickAction(icon: Icons.arrow_downward_rounded, label: 'Udhaar', onTap: () {}),
        QuickAction(icon: Icons.arrow_upward_rounded, label: 'Jama', onTap: () {}),
        QuickAction(icon: Icons.account_balance_wallet_outlined, label: 'New loan', onTap: () {}),
        QuickAction(icon: Icons.picture_as_pdf_outlined, label: 'Statement', onTap: () {}),
      ]),
      const SizedBox(height: 26),
      const _SectionTitle(title: 'Recent activity', action: 'See ledger'),
      const SizedBox(height: 12),
      const ActivityTile(name: 'Nitin Sharma', detail: 'Udhaar · Today, 10:42 AM', amount: '₹ 4,500', positive: true),
      const ActivityTile(name: 'Pooja Verma', detail: 'Jama · Yesterday, 6:18 PM', amount: '₹ 2,000', positive: false),
      const ActivityTile(name: 'Yogesh Patel', detail: 'Loan repayment · 28 Sep, 4:05 PM', amount: '₹ 3,250', positive: false),
    ]),
  );
}

class MetricCard extends StatelessWidget {
  final IconData icon; final String label, value;
  const MetricCard({super.key, required this.icon, required this.label, required this.value});
  @override
  Widget build(BuildContext context) => Card(child: Padding(
    padding: const EdgeInsets.all(16),
    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Icon(icon, size: 22, color: Theme.of(context).colorScheme.primary),
      const Spacer(), Text(label, style: const TextStyle(color: Colors.black54)),
      const SizedBox(height: 4), Text(value, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
    ]),
  ));
}

class QuickAction extends StatelessWidget {
  final IconData icon; final String label; final VoidCallback onTap;
  const QuickAction({super.key, required this.icon, required this.label, required this.onTap});
  @override
  Widget build(BuildContext context) => FilledButton.tonalIcon(
    onPressed: onTap, icon: Icon(icon), label: Text(label),
    style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15)),
  );
}

class _SectionTitle extends StatelessWidget {
  final String title, action;
  const _SectionTitle({required this.title, required this.action});
  @override
  Widget build(BuildContext context) => Row(children: [
    Text(title, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800)),
    const Spacer(), TextButton(onPressed: () {}, child: Text(action)),
  ]);
}

class ActivityTile extends StatelessWidget {
  final String name, detail, amount; final bool positive;
  const ActivityTile({super.key, required this.name, required this.detail, required this.amount, required this.positive});
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 5),
      leading: CircleAvatar(child: Text(name.substring(0, 1))),
      title: Text(name, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(detail),
      trailing: Text((positive ? '+' : '-') + amount, style: TextStyle(fontWeight: FontWeight.w800, color: positive ? Colors.orange.shade700 : Colors.green.shade700)),
    ),
  );
}

class CustomersPage extends StatefulWidget {
  const CustomersPage({super.key});
  @override State<CustomersPage> createState() => _CustomersPageState();
}

class _CustomersPageState extends State<CustomersPage> {
  String query = '';
  @override
  Widget build(BuildContext context) {
    final filtered = customers.where((c) => c.name.toLowerCase().contains(query.toLowerCase())).toList();
    return PageFrame(
      title: 'Customers',
      subtitle: filtered.length.toString() + ' active customers',
      actions: [FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('Add customer'))],
      child: Column(children: [
        TextField(
          onChanged: (v) => setState(() => query = v),
          decoration: InputDecoration(
            hintText: 'Search by name or mobile', prefixIcon: const Icon(Icons.search),
            filled: true, fillColor: Colors.white,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(18), borderSide: BorderSide.none),
          ),
        ),
        const SizedBox(height: 16),
        ...filtered.map((customer) => Card(
          margin: const EdgeInsets.only(bottom: 10),
          child: ListTile(
            contentPadding: const EdgeInsets.all(12),
            leading: CircleAvatar(radius: 25, child: Text(customer.name.substring(0, 1))),
            title: Text(customer.name, style: const TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text(customer.phone + ' · ' + customer.lastActivity),
            trailing: Column(mainAxisAlignment: MainAxisAlignment.center, crossAxisAlignment: CrossAxisAlignment.end, children: [
              Text('₹ ' + customer.balance.toStringAsFixed(0), style: const TextStyle(fontWeight: FontWeight.w800)),
              Text(customer.receives ? 'Udhaar' : 'Jama', style: TextStyle(fontSize: 12, color: customer.receives ? Colors.orange : Colors.green)),
            ]),
          ),
        )),
      ]),
    );
  }
}

class LedgerPage extends StatelessWidget {
  const LedgerPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    title: 'Ledger',
    subtitle: 'Every entry keeps date, exact time and history',
    actions: [FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('New entry'))],
    child: const Column(children: [
      ActivityTile(name: 'Nitin Sharma', detail: 'Udhaar · 29 Sep 2026, 10:42 AM · Grocery', amount: '₹ 4,500', positive: true),
      ActivityTile(name: 'Pooja Verma', detail: 'Jama · 28 Sep 2026, 6:18 PM · Payment', amount: '₹ 2,000', positive: false),
      ActivityTile(name: 'Yogesh Patel', detail: 'Udhaar · 28 Sep 2026, 4:05 PM · Material', amount: '₹ 6,000', positive: true),
      ActivityTile(name: 'Umesh Sahu', detail: 'Deleted · 27 Sep 2026, 11:31 AM · Kept for history', amount: '₹ 850', positive: true),
    ]),
  );
}

class LoansPage extends StatelessWidget {
  const LoansPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    title: 'Loans & Byaj',
    subtitle: 'Principal, interest and repayments in one place',
    actions: [FilledButton.icon(onPressed: () {}, icon: const Icon(Icons.add), label: const Text('New loan'))],
    child: Column(children: [
      const Row(children: [
        Expanded(child: MetricCard(icon: Icons.account_balance_wallet_outlined, label: 'Principal outstanding', value: '₹ 82K')),
        SizedBox(width: 12),
        Expanded(child: MetricCard(icon: Icons.percent_rounded, label: 'Interest outstanding', value: '₹ 7.4K')),
      ]),
      const SizedBox(height: 18),
      Card(child: Column(children: [
        const ListTile(
          leading: CircleAvatar(child: Icon(Icons.percent)),
          title: Text('Sample customer loan', style: TextStyle(fontWeight: FontWeight.w800)),
          subtitle: Text('Simple interest · Monthly · 18% p.a.'),
          trailing: Text('₹ 28,500', style: TextStyle(fontWeight: FontWeight.w800)),
        ),
        const Divider(height: 1),
        const ListTile(title: Text('Next due'), subtitle: Text('15 Oct 2026 · Interest + principal'), trailing: Icon(Icons.chevron_right)),
      ])),
    ]),
  );
}

class SettingsPage extends StatelessWidget {
  const SettingsPage({super.key});
  @override
  Widget build(BuildContext context) => PageFrame(
    title: 'Settings',
    subtitle: 'Profile, security, backup and app updates',
    child: Column(children: [
      const Card(child: ListTile(
        leading: CircleAvatar(radius: 27, child: Icon(Icons.auto_awesome)),
        title: Text('Guru Shree', style: TextStyle(fontWeight: FontWeight.w800)),
        subtitle: Text('Business profile · Mobile · Email'),
        trailing: Icon(Icons.chevron_right),
      )),
      const SizedBox(height: 12),
      const _SettingTile(icon: Icons.cloud_sync_outlined, title: 'Backup & sync', subtitle: 'Cloud, local export and sync status'),
      const _SettingTile(icon: Icons.security_outlined, title: 'Security & PIN', subtitle: 'Lock, session and trusted device settings'),
      const _SettingTile(icon: Icons.notifications_none_rounded, title: 'Reminders', subtitle: 'Due, overdue and interest reminders'),
      const _SettingTile(icon: Icons.picture_as_pdf_outlined, title: 'Statements & sharing', subtitle: 'PDF, WhatsApp, SMS and print'),
      const _SettingTile(icon: Icons.system_update_alt_rounded, title: 'App updates', subtitle: 'Version 0.1.0 · Update-ready architecture'),
      const _SettingTile(icon: Icons.help_outline_rounded, title: 'Support', subtitle: 'Help and support'),
    ]),
  );
}

class _SettingTile extends StatelessWidget {
  final IconData icon; final String title, subtitle;
  const _SettingTile({required this.icon, required this.title, required this.subtitle});
  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: ListTile(
      leading: Icon(icon), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)),
      subtitle: Text(subtitle), trailing: const Icon(Icons.chevron_right), onTap: () {},
    ),
  );
}
