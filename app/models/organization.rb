# A (News or Watchdog) organization with the power to create DocumentCloud
# accounts and upload documents.
class Organization < ActiveRecord::Base
  include ActionView::Helpers::DateHelper
  include DC::Access
  include DC::Roles

  attr_accessor :document_count, :note_count, :members

  has_many :memberships
  has_many :accounts, :through => :memberships

  validates_presence_of :name, :slug
  validates_uniqueness_of :name, :slug
  validates_format_of :slug, :with => DC::Validators::SLUG
  
  # Sanitizations:
  text_attr :name
  
  def self.default_for(account)
    self.first(
      :include => "memberships",
      :conditions => ["memberships.account_id = ? and memberships.default is true", account.id]
    )
  end

  # Retrieve the names of the organizations for the result set of documents.
  def self.names_for_documents(docs)
    ids = docs.map {|doc| doc.organization_id }.uniq
    self.all(:conditions => {:id => ids}, :select => 'id, name').inject({}) do |hash, org|
      hash[org.id] = org.name; hash
    end
  end

  # Retrieve the list of organizations with public documents, including counts.
  def self.listed
    public_doc_counts   = Document.unrestricted.count :group => 'organization_id'
    public_note_counts  = Annotation.public_note_counts_by_organization
    orgs = self.all(:conditions => {:id => public_doc_counts.keys, :demo => false})
    orgs.each do |org|
      org.document_count = public_doc_counts[org.id]  || 0
      org.note_count     = public_note_counts[org.id] || 0
    end
    orgs
  end
  
  # Retrieve all Organizations, just returning the name and slug.
  def self.all_slugs
    self.all(:select => ['name, slug']).map do |org| 
      {:name => org.name, :slug => org.slug}
    end
  end

  # Populates the members accessor with all the organizaton's accounts
  def self.populate_members_info( organizations )
    sql = <<-EOS
    select
       memberships.organization_id, memberships.role,
       accounts.id,                 accounts.email,
       accounts.first_name,         accounts.last_name
    from memberships
       inner join accounts on accounts.id = memberships.account_id
    where memberships.organization_id in (#{organizations.map(&:id).join(',')})
    EOS
    rows = self.connection.select_all( sql )
    accounts_map = rows.group_by{|row| row['organization_id'].to_i }
    organizations.each do | organization |
      organization.members = accounts_map[ organization.id ].map do | account |
        account.delete('organization_id')
        account['hashed_email']=Digest::MD5.hexdigest( account['email'].downcase.gsub(/\s/, '') ) if account['email']
        account
      end
    end
    return organizations
  end


  # How many documents have been uploaded across the whole organization?
  def document_count
    @document_count ||= Document.count(:conditions => {:organization_id => id})
  end

  # The list of all administrator emails in the organization.
  def admin_emails
    self.accounts.admin.all(:select => [:email]).map {|acc| acc.email }
  end

  def canonical( options = {} )
    attrs = {
      'name' => name,
      'slug' => slug,
      'demo' => demo,
      'id'   => id
    }
    if options[:include_document_count]
      attrs['document_count'] = document_count
    end
    if self.members
      attrs['members'] = self.members
    end
    attrs
  end

  def to_json(options = nil)
    self.canonical( :include_document_count=>true ).to_json
  end

end
